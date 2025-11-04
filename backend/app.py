import os
from typing import Dict, Any

from flask import Flask, jsonify, request
from flask_cors import CORS
import requests

app = Flask(__name__)
CORS(app)

OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY") or os.getenv("OWM_API_KEY")


def fetch_weather(city: str) -> Dict[str, Any]:
    """Return weather with a robust fallback.
    1) Try OpenWeather (needs OPENWEATHER_API_KEY)
    2) Fallback: Open-Meteo geocoding + forecast (no key)
    """
    # Try OpenWeather first if key present
    if OPENWEATHER_API_KEY:
        try:
            r = requests.get(
                "https://api.openweathermap.org/data/2.5/weather",
                params={"q": city, "appid": OPENWEATHER_API_KEY, "units": "metric"},
                timeout=10,
            )
            if r.status_code == 200:
                j = r.json()
                return {
                    "temp_c": float(j.get("main", {}).get("temp", 0)),
                    "humidity": int(j.get("main", {}).get("humidity", 0)),
                    "rain_1h": float(j.get("rain", {}).get("1h", 0)),
                }
        except requests.RequestException:
            pass  # fall through to Open-Meteo

    # Fallback: Open-Meteo (no key)
    geo = requests.get(
        "https://geocoding-api.open-meteo.com/v1/search",
        params={"name": city, "count": 1, "language": "en", "format": "json"},
        timeout=10,
    )
    if geo.status_code != 200:
        raise RuntimeError(f"Geocoding failed: {geo.status_code} {geo.text}")
    gj = geo.json()
    if not gj.get("results"):
        raise RuntimeError("City not found")
    lat = gj["results"][0]["latitude"]
    lon = gj["results"][0]["longitude"]
    meteo = requests.get(
        "https://api.open-meteo.com/v1/forecast",
        params={
            "latitude": lat,
            "longitude": lon,
            "current": "temperature_2m,relative_humidity_2m,precipitation",
        },
        timeout=10,
    )
    if meteo.status_code != 200:
        raise RuntimeError(f"Open-Meteo failed: {meteo.status_code} {meteo.text}")
    mj = meteo.json()
    cur = mj.get("current", {})
    return {
        "temp_c": float(cur.get("temperature_2m", 0)),
        "humidity": int(cur.get("relative_humidity_2m", 0)),
        "rain_1h": float(cur.get("precipitation", 0)),
    }


def recommend_spray(crop_type: str, disease_name: str, soil_moisture: float, weather: Dict[str, Any]) -> Dict[str, str]:
    crop = (crop_type or "").strip().lower()
    disease = (disease_name or "").strip().lower()
    hum, temp, rain = weather["humidity"], weather["temp_c"], weather["rain_1h"]
    moist = float(soil_moisture)

    rec = {
        "recommended_pesticide": "Neem Oil (Azadirachtin 0.3%)",
        "quantity": "3 ml per liter",
        "best_time": "Evening (5-7 PM)",
        "reason": "Default safe organic recommendation.",
        "precautions": "Wear gloves and mask. Avoid direct sun and rain.",
    }

    fungal = any(k in disease for k in ["blight", "mildew", "mold", "rust", "spot"])  # noqa: E501
    bacterial = "bacterial" in disease
    insect = any(k in disease for k in ["aphid", "whitefly", "borer", "thrip", "caterpillar"])  # noqa: E501
    viral = "virus" in disease or "viral" in disease

    high_humid = hum >= 80
    warm = 20 <= temp <= 34
    very_hot = temp > 34
    wet_soil = moist >= 60
    dry_soil = moist <= 30
    raining = rain > 0

    crop_mod = {
        "tomato": {"fungicide": ("Copper Oxychloride", "2.5 g per liter")},
        "wheat": {"fungicide": ("Propiconazole 25% EC", "1 ml per liter")},
        "rice": {"fungicide": ("Tricyclazole 75% WP", "0.6 g per liter")},
        "cotton": {"insecticide": ("Imidacloprid 17.8% SL", "0.3 ml per liter")},
    }

    if fungal:
        if high_humid and warm:
            name, dose = crop_mod.get(crop, {}).get("fungicide", ("Copper Oxychloride", "2.5 g per liter"))
            rec.update({
                "recommended_pesticide": name,
                "quantity": dose,
                "best_time": "Morning (6-9 AM)" if not very_hot else "Evening (5-7 PM)",
                "reason": "High humidity with warm conditions favor fungal growth.",
                "precautions": "Avoid spraying during rain. Wear gloves and eye protection.",
            })
        else:
            rec.update({
                "recommended_pesticide": "Neem Oil (Azadirachtin 0.3%)",
                "quantity": "3 ml per liter",
                "best_time": "Evening (5-7 PM)",
                "reason": "Mild fungal pressure expected; organic spray sufficient.",
                "precautions": "Ensure uniform coverage on both leaf surfaces.",
            })
    elif bacterial:
        rec.update({
            "recommended_pesticide": "Copper Hydroxide 77% WP",
            "quantity": "2 g per liter",
            "best_time": "Morning (6-9 AM)",
            "reason": "Copper compounds effective against bacterial diseases.",
            "precautions": "Do not mix with strong alkalis; avoid spraying before rain.",
        })
    elif insect:
        if high_humid and warm:
            rec.update({
                "recommended_pesticide": "Spinosad 45% SC",
                "quantity": "0.3 ml per liter",
                "best_time": "Evening (5-7 PM)",
                "reason": "Warm, humid weather usually increases insect activity.",
                "precautions": "Avoid drift; protect pollinators (spray at dusk).",
            })
        else:
            rec.update({
                "recommended_pesticide": "Neem Oil (Azadirachtin 0.15%)",
                "quantity": "3 ml per liter",
                "best_time": "Evening (5-7 PM)",
                "reason": "Moderate insect pressure; organic control recommended.",
                "precautions": "Cover the undersides of leaves thoroughly.",
            })
    elif viral:
        rec.update({
            "recommended_pesticide": "Insect vector control (Imidacloprid 17.8% SL)",
            "quantity": "0.3 ml per liter",
            "best_time": "Evening (5-7 PM)",
            "reason": "Viral diseases require vector control (aphids/whiteflies).",
            "precautions": "Remove infected plants; use sticky traps.",
        })

    if wet_soil:
        rec["reason"] += " Soil moisture is high; avoid over‑irrigation."
    if dry_soil:
        rec["reason"] += " Soil moisture is low; lightly irrigate before spray."
    if raining:
        rec["best_time"] = "After rain stops (leaves dry)"
        rec["precautions"] = "Do not spray during rain; wait for foliage to dry."

    return rec


@app.route("/smart-spray", methods=["POST"])
def smart_spray():
    try:
        data = request.get_json(force=True) or {}
        crop_type = data.get("crop_type")
        disease_name = data.get("disease_name")
        soil_moisture = data.get("soil_moisture")
        city = data.get("city")

        missing = [k for k, v in [("crop_type", crop_type), ("disease_name", disease_name), ("soil_moisture", soil_moisture), ("city", city)] if v in (None, "")]
        if missing:
            return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

        weather = fetch_weather(str(city))
        rec = recommend_spray(str(crop_type), str(disease_name), float(soil_moisture), weather)

        return jsonify({
            **rec,
            "weather": weather,
            "inputs": {
                "crop_type": crop_type,
                "disease_name": disease_name,
                "soil_moisture": soil_moisture,
                "city": city,
            },
        }), 200
    except requests.RequestException as e:
        return jsonify({"error": "Weather service unavailable", "detail": str(e)}), 502
    except Exception as e:
        return jsonify({"error": "Internal server error", "detail": str(e)}), 500


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"}), 200


@app.route("/predict", methods=["POST"])
def predict_mock():
    """Mock /predict for integration: accepts an image file and returns a sample prediction.
    Replace this with your CNN inference when you add a model.
    """
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400
    file = request.files["file"]
    if not file or file.filename == "":
        return jsonify({"error": "Empty file"}), 400
    # Mock response
    return jsonify({
        "disease": "Leaf Mold",
        "confidence": 0.85,
    }), 200


if __name__ == "__main__":
    port = int(os.getenv("PORT", "5000"))
    app.run(host="0.0.0.0", port=port, debug=True)
