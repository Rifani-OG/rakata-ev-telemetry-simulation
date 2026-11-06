# RAKATA URBAN — KMHE 2026 Telemetry & Simulation Hub

Computational engineering pipeline, high-frequency telemetry analytics, and driver-in-the-loop simulation suite for the **RAKATA Urban Concept Electric Vehicle** at **Kontes Mobil Hemat Energi (KMHE) 2026** (Institut Teknologi Bandung).

---

## Interactive Applications & Workbenches

| Module | Description | Location |
|---|---|---|
| **Landing Page & System Hub** | Central technical datasheet, vehicle specifications, and validation plots | [`./index.html`](./index.html) |
| **Telemetry Web Analyzer (V6)** | Dual-lap telemetry replay, GPS dead-zone interpolation, Leaflet track mapping, and synchronized Chart.js time series | [`./dashboard/index.html`](./dashboard/index.html) |
| **3D Driver-in-the-Loop Trainer** | Three.js track simulation modeling elevation, cornering curvature, and BLDC motor dynamics for Arcamanik Circuit | [`./simulator/RAKATA_KMHE_Simulator_V4_TD12/RAKATA_KMHE_TD12/RAKATA_TD10_Trainer.html`](./simulator/RAKATA_KMHE_Simulator_V4_TD12/RAKATA_KMHE_TD12/RAKATA_TD10_Trainer.html) |
| **KMHE UNEJ 6-Lap Full Attempt Simulator** | Multi-lap race strategy optimizer modeling cumulative energy consumption (Wh) across official attempt runs | [`./simulator/RAKATA_KMHE_Simulator_V4_TD12/RAKATA_KMHE_TD12/RAKATA_KMHE_Attempt.html`](./simulator/RAKATA_KMHE_Simulator_V4_TD12/RAKATA_KMHE_TD12/RAKATA_KMHE_Attempt.html) |
| **System Identification & Validation Report** | MATLAB/Simulink and Python non-linear least squares parameter estimation against experimental track data | [`./simulator/RAKATA_KMHE_MATLAB_SIMULINK/RAKATA_TD10_ONLY/results/TD10_Audit_Validation.html`](./simulator/RAKATA_KMHE_MATLAB_SIMULINK/RAKATA_TD10_ONLY/results/TD10_Audit_Validation.html) |

---

## Vehicle Specifications & Validation Benchmarks

| Parameter | Specification | Notes |
|---|---|---|
| **Category** | Urban Concept Electric | KMHE 2026 Regulations |
| **Total Mass ($m$)** | 141 kg | Vehicle (71 kg) + Driver (70 kg) |
| **Gear Ratio ($N$)** | 1:11 | Single-stage reduction |
| **Nominal Bus Voltage ($V$)** | 54.0 V | 13S Li-ion battery pack |
| **Circuit** | Sport Jabar Arcamanik | ~1,440 m per lap |
| **Target Lap Time ($t_{lap}$)** | $\le$ 220 s | 3 minutes 40 seconds |
| **Speed Limit ($v_{max}$)** | $\le$ 35.3 km/h | Competition safety threshold |
| **Validation Speed RMSE** | 1.59 km/h | Holdout validation vs. TD10 experimental log |
| **Energy Consumption MAE** | 0.22 Wh | Residual error per lap |

---

## Repository Structure

```text
urban/
├── index.html                     # Root landing page (Technical Datasheet Hub)
├── dashboard/                     # Web-based telemetry analysis workbench
│   ├── index.html                 # Active Telemetry Viewer V6 (Lag Recovery & Leaflet GPS)
│   └── versions_archive/          # Historical telemetry viewer iterations
├── docs/                          # Technical documentation, SOPs, and game guides
│   ├── How To Test Drive Urban.pdf # Track test drive SOP
│   ├── telem.logic.pdf            # Telemetry calculations and edge logic
│   └── RAKATA_Panduan_Game.md     # Simulator physics model, HUD, and gamepad guide
├── nodered_flows/                 # Node-RED IoT telemetry streaming flows
│   ├── README.md                  # Flow documentation and broker setup instructions
│   ├── flowsUrbanHP.json          # Driver cockpit display with GPS distance integration
│   ├── flowsUrbanPaddock.json     # Paddock / pit-lane monitoring and CSV logging
│   └── Kode_Node_PROTO_Speed_AVG/ # Speed moving-average filters and parser scripts
├── simulator/                     # Driver training and digital twin models
│   ├── RAKATA_KMHE_Simulator_V4_TD12/ # Active Three.js 3D driver simulators
│   ├── RAKATA_KMHE_MATLAB_SIMULINK/   # MATLAB/Simulink physics models & audit reports
│   └── strategies_and_records/        # Optimal throttle SVG profiles & energy records
└── telemetry_logs/                # Experimental track telemetry datasets
    ├── csv_raw/                   # Pre-recorded CSV track logs (TD10, TD13, etc.)
    └── sessions_html/             # Session-specific analysis and lap summaries
```

---

## Quick Start Guide

### 1. Running the Telemetry Workbench
1. Open [`dashboard/index.html`](./dashboard/index.html) in any modern web browser.
2. Click **Load Sample (TD10)** or **Load Sample (TD13)** to instantly inspect pre-recorded competition telemetry, or click **Import CSV / XLSX** to upload a custom run log.
3. Analyze lap splits, speed distributions, instantaneous electrical power, and throttle commands synchronized with the interactive Leaflet track map.

### 2. Launching Driver Training Simulation
1. Open [`simulator/RAKATA_KMHE_Simulator_V4_TD12/RAKATA_KMHE_TD12/RAKATA_TD10_Trainer.html`](./simulator/RAKATA_KMHE_Simulator_V4_TD12/RAKATA_KMHE_TD12/RAKATA_TD10_Trainer.html).
2. Connect a Gamepad (Xbox / PlayStation controller) or use keyboard controls (`W`/`S` throttle/brake, `A`/`D` steering).
3. Follow the throttle strategy guide in [`docs/RAKATA_Panduan_Game.md`](./docs/RAKATA_Panduan_Game.md) to practice pulse-and-glide driving profiles.

### 3. Deploying Node-RED IoT Telemetry
1. Open local Node-RED runtime (`http://localhost:1880`).
2. Import [`nodered_flows/flowsUrbanHP.json`](./nodered_flows/flowsUrbanHP.json) for the in-cockpit driver HUD or [`nodered_flows/flowsUrbanPaddock.json`](./nodered_flows/flowsUrbanPaddock.json) for the pit-lane logging station.
3. Update the MQTT broker endpoint to your HiveMQ Cloud cluster URL as detailed in [`nodered_flows/README.md`](./nodered_flows/README.md).

---

## License & Attribution

Developed by the **RAKATA Team**, Institut Teknologi Bandung (ITB) for the Kontes Mobil Hemat Energi (KMHE).
All rights reserved &copy; 2026.
