# Node-RED Telemetry Flows — RAKATA URBAN KMHE 2026

This directory contains the edge stream processing flows used in the RAKATA Urban Concept Electric Vehicle telemetry architecture during track testing and competition attempts.

## Flow Modules

1. **`flowsUrbanHP.json` (Cockpit Driver Display & GPS Distance Integration)**
   - Deployed on the in-vehicle smartphone/tablet cockpit interface.
   - Computes high-precision GPS distance compensation across transmission dead-zones.
   - Provides real-time driver telemetry indicators: velocity, throttle percentage, battery voltage, phase current, and instant electrical power.

2. **`flowsUrbanPaddock.json` / `Paddock_RAKATA_V2.json` (Paddock Pit-Lane Monitoring)**
   - Deployed on engineering paddock workstations.
   - Subscribes to the cloud MQTT broker topics to log incoming high-frequency telemetry.
   - Exports synchronized CSV session logs for offline digital twin analysis and replay.

3. **`Kode_Node_PROTO_Speed_AVG/`**
   - Helper scripts and parser logic for speed smoothing, moving average filtering, and web HUD formatting.

## MQTT Configuration & Setup

All flow JSON files use the standardized placeholder:
```
<YOUR_HIVEMQ_CLUSTER_URL>.s1.eu.hivemq.cloud
```

To configure your own HiveMQ Cloud or local MQTT broker:
1. Open Node-RED (`http://localhost:1880`).
2. Import the desired flow file (`flowsUrbanHP.json` or `flowsUrbanPaddock.json`).
3. Double-click any MQTT node (or open the **Configuration nodes** sidebar).
4. Edit the `mqtt-broker` and `tls-config` nodes:
   - **Broker / Servername**: Replace `<YOUR_HIVEMQ_CLUSTER_URL>.s1.eu.hivemq.cloud` with your HiveMQ cluster URL.
   - **Port**: `8883` (TLS) or `1883` (TCP).
   - **Username / Password**: Enter your broker client credentials.
5. Click **Deploy**.
