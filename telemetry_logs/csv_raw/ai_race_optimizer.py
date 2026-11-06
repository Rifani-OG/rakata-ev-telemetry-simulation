import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from sklearn.ensemble import HistGradientBoostingRegressor

# ==============================================================================
# 1. LOAD DATA CSV & EKSTRAKSI FITUR 1 HZ
# ==============================================================================
COL_NAMES = [
    'timestamp', 'lat', 'lng', 'speed', 'lap', 'throttle', 
    'current_mA', 'voltage', 'power_W', 'energy_Wh', 'distance_km', 'time_ms'
]

FILES = {
    'Attempt_1': 'data_telemetri_KMHE_attemp1.csv',
    'Attempt_2': 'data_telemetri_KMHE_Attemp2.csv',
    'Attempt_3': 'data_telemetri_KMHE_Attemp3.csv',
    'Attempt_4': 'data_telemetri_KMHE_Attemp4.csv'
}

def load_telemetry(filepath, name):
    df = pd.read_csv(filepath, header=None, names=COL_NAMES)
    df['rel_time_s'] = (df['time_ms'] - df['time_ms'].iloc[0]) / 1000.0
    df['rel_dist_m'] = (df['distance_km'] - df['distance_km'].iloc[0]) * 1000.0
    df['rel_energy_Wh'] = df['energy_Wh'] - df['energy_Wh'].iloc[0]
    
    # Agregasi ke 1 detik (1 Hz) agar sinkron dengan update rate kecepatan GPS
    df['time_bin'] = np.floor(df['rel_time_s']).astype(int)
    agg = df.groupby('time_bin').agg({
        'speed': 'mean',
        'throttle': 'mean',
        'power_W': 'mean',
        'lat': 'last',
        'lng': 'last',
        'rel_dist_m': 'last',
        'rel_energy_Wh': 'last'
    }).reset_index()
    
    # Hitung perubahan kecepatan (dv/dt) dan kelengkungan tikungan (curvature)
    agg['raw_dv'] = agg['speed'].shift(-1) - agg['speed']
    agg['throttle_lag1'] = agg['throttle'].shift(1).bfill()
    
    dlat = agg['lat'].diff().fillna(0)
    dlng = agg['lng'].diff().fillna(0)
    heading = np.arctan2(dlng, dlat)
    curv = np.abs(np.arctan2(np.sin(heading.diff()), np.cos(heading.diff()))).fillna(0)
    agg['curvature_roll'] = curv.rolling(5, min_periods=1).mean()
    agg['attempt'] = name
    return agg.dropna(subset=['raw_dv']).copy()

print("[1/4] Memuat data telemetri dari 4 Attempt...")
dfs = {k: load_telemetry(v, k) for k, v in FILES.items()}
all_data = pd.concat(dfs.values(), ignore_index=True)

# ==============================================================================
# 2. LATIH MODEL AI DIGITAL TWIN (FASE GLIDE VS FASE PULSE)
# ==============================================================================
print("[2/4] Melatih Model AI Digital Twin (Pulse & Glide Dynamics)...")
glide_data = all_data[(all_data['throttle'] == 0) & (all_data['throttle_lag1'] == 0) & (all_data['speed'] > 8)]
pulse_data = all_data[all_data['throttle'] >= 15]

# Model perlambatan saat meluncur (Throttle = 0%)
model_dv_glide = HistGradientBoostingRegressor(max_iter=100, monotonic_cst=[-1, -1], random_state=42)
model_dv_glide.fit(glide_data[['speed', 'curvature_roll']], glide_data['raw_dv'])

# Model percepatan dan konsumsi daya saat gas diinjak (Throttle > 0%)
model_pow_pulse = HistGradientBoostingRegressor(max_iter=150, monotonic_cst=[-1, 1, 0], random_state=42)
model_dv_pulse = HistGradientBoostingRegressor(max_iter=150, monotonic_cst=[-1, 1, -1], random_state=42)

model_pow_pulse.fit(pulse_data[['speed', 'throttle', 'curvature_roll']], pulse_data['power_W'])
model_dv_pulse.fit(pulse_data[['speed', 'throttle', 'curvature_roll']], pulse_data['raw_dv'])

# ==============================================================================
# 3. EKSTRAKSI GEOMETRI 1 LAP SIRKUIT (1.520 METER PER 10 METER)
# ==============================================================================
print("[3/4] Memetakan geometri sirkuit dari Flying Lap (Attempt 2: 1487m - 3007m)...")
att2 = dfs['Attempt_2']
lap2 = att2[(att2['rel_dist_m'] >= 1487.0) & (att2['rel_dist_m'] <= 3007.0)].copy()
lap2['lap_dist_m'] = lap2['rel_dist_m'] - 1487.0

actual_time_s = lap2['time_bin'].iloc[-1] - lap2['time_bin'].iloc[0]
actual_energy_Wh = lap2['rel_energy_Wh'].iloc[-1] - lap2['rel_energy_Wh'].iloc[0]
actual_eff = 1.520 / (actual_energy_Wh / 1000.0)

DS = 10.0 # Resolusi segmen lintasan = 10 meter
dist_grid = np.arange(0, 1520, DS)
N_seg = len(dist_grid)

track_df = pd.DataFrame({'dist_m': dist_grid})
track_df['lat'] = np.interp(track_df['dist_m'], lap2['lap_dist_m'], lap2['lat'])
track_df['lng'] = np.interp(track_df['dist_m'], lap2['lap_dist_m'], lap2['lng'])
track_df['curvature'] = np.interp(track_df['dist_m'], lap2['lap_dist_m'], lap2['curvature_roll'])
track_df['driver_speed'] = np.interp(track_df['dist_m'], lap2['lap_dist_m'], lap2['speed'])
track_df['driver_throttle'] = np.interp(track_df['dist_m'], lap2['lap_dist_m'], lap2['throttle'])

# ==============================================================================
# 4. ALGORITMA AI OPTIMIZER (DYNAMIC PROGRAMMING BELLMAN)
# ==============================================================================
print("[4/4] Menjalankan Dynamic Programming untuk mencari titik Pulse & Glide paling optimal...")
v_grid = np.round(np.arange(14.0, 36.1, 0.1), 1) # Grid kecepatan resolusi 0.1 km/jam
V_num = len(v_grid)
throttles = [0, 75, 90, 100] # Pilihan bukaan gas (%)

def optimize_lap_strategy(lambda_time=0.065, switch_penalty_Wh=0.06, v_start=22.5):
    # Matriks biaya: [segmen, index_kecepatan, mode_sebelumnya (0=Glide, 1=Pulse)]
    cost_to_go = np.full((N_seg + 1, V_num, 2), np.inf)
    policy_thr = np.zeros((N_seg, V_num, 2), dtype=int)
    next_v_idx = np.zeros((N_seg, V_num, 2), dtype=int)
    next_mode = np.zeros((N_seg, V_num, 2), dtype=int)
    
    # Syarat batas akhir lap: kecepatan finish minimal sama dengan kecepatan start (Flying Lap)
    for vi, v in enumerate(v_grid):
        if v >= v_start - 0.3:
            cost_to_go[N_seg, vi, :] = 0.0
            
    # Iterasi mundur dari meter ke-1510 menuju meter ke-0
    for i in range(N_seg - 1, -1, -1):
        curv = track_df['curvature'].iloc[i]
        max_v_corner = 24.5 if curv > 0.12 else (28.5 if curv > 0.06 else 35.5)
        
        # Prediksi perlambatan saat Glide (Throttle = 0%)
        df_g = pd.DataFrame({'speed': v_grid, 'curvature_roll': np.full(V_num, curv)})
        dv_g = np.minimum(model_dv_glide.predict(df_g), -0.30 - 1.2 * curv)
        pow_g = np.full(V_num, 7.8) # Daya standby sistem 54V
        
        # Prediksi percepatan & daya saat Pulse (Throttle > 0%)
        vv, tt = np.meshgrid(v_grid, throttles[1:], indexing='ij')
        df_p = pd.DataFrame({'speed': vv.ravel(), 'throttle': tt.ravel(), 'curvature_roll': np.full(vv.size, curv)})
        pow_p = np.clip(model_pow_pulse.predict(df_p), 50.0, 950.0).reshape(V_num, len(throttles)-1)
        dv_p = np.maximum(model_dv_pulse.predict(df_p), 0.3).reshape(V_num, len(throttles)-1)
        
        pow_all = np.column_stack([pow_g, pow_p])
        dv_all = np.column_stack([dv_g, dv_p])
        
        for vi, v in enumerate(v_grid):
            if v > max_v_corner:
                continue
            dt = DS / (v / 3.6) # Waktu tempuh segmen 10 meter (detik)
            
            for ti, thr in enumerate(throttles):
                if curv > 0.08 and thr > 0:
                    continue # Hindari gas penuh di tengah tikungan tajam
                
                v_next = v + dv_all[vi, ti] * dt
                if v_next < v_grid[0] or v_next > min(v_grid[-1], max_v_corner):
                    continue
                
                v_next_i = int(np.round((v_next - v_grid[0]) / 0.1))
                if not (0 <= v_next_i < V_num):
                    continue
                
                dE_Wh = pow_all[vi, ti] * (dt / 3600.0)
                curr_m = 0 if thr == 0 else 1
                
                for prev_m in [0, 1]:
                    sw_cost = switch_penalty_Wh if (prev_m == 0 and curr_m == 1) else 0.0
                    total_c = dE_Wh + (lambda_time * dt) + sw_cost + cost_to_go[i + 1, v_next_i, curr_m]
                    if total_c < cost_to_go[i, vi, prev_m]:
                        cost_to_go[i, vi, prev_m] = total_c
                        policy_thr[i, vi, prev_m] = thr
                        next_v_idx[i, vi, prev_m] = v_next_i
                        next_mode[i, vi, prev_m] = curr_m
                        
    # Rollout maju dari meter ke-0 hingga ke-1520
    curr_vi = int(np.round((v_start - v_grid[0]) / 0.1))
    curr_m = 0
    opt_v, opt_thr, opt_pow, opt_t, opt_E = [], [], [], [0.0], [0.0]
    
    for i in range(N_seg):
        v = v_grid[curr_vi]
        thr = policy_thr[i, curr_vi, curr_m]
        curv = track_df['curvature'].iloc[i]
        dt = DS / (v / 3.6)
        
        pw = 7.8 if thr == 0 else float(np.clip(model_pow_pulse.predict(
            pd.DataFrame({'speed': [v], 'throttle': [thr], 'curvature_roll': [curv]}))[0], 50.0, 950.0))
        dE = pw * (dt / 3600.0)
        
        opt_v.append(v)
        opt_thr.append(thr)
        opt_pow.append(pw)
        opt_t.append(opt_t[-1] + dt)
        opt_E.append(opt_E[-1] + dE)
        
        curr_vi, curr_m = next_v_idx[i, curr_vi, curr_m], next_mode[i, curr_vi, curr_m]
        
    track_df['ai_speed_kmh'] = opt_v
    track_df['ai_throttle_pct'] = opt_thr
    track_df['ai_power_W'] = opt_pow
    track_df['ai_action'] = np.where(track_df['ai_throttle_pct'] > 0, 'PULSE (GAS)', 'GLIDE (LEPAS GAS)')
    return opt_t[-1], opt_E[-1]

ai_time_s, ai_energy_Wh = optimize_lap_strategy(lambda_time=0.068, switch_penalty_Wh=0.06, v_start=22.5)
ai_eff = 1.520 / (ai_energy_Wh / 1000.0)

print("\n" + "="*65)
print(f"HASIL PERBANDINGAN 1 FLYING LAP (PANJANG SIRKUIT: 1.520 METER)")
print("="*65)
print(f"Aktual Driver (Attempt 2) -> Waktu: {actual_time_s:.1f} dtk | Energi: {actual_energy_Wh:.2f} Wh | Efisiensi: {actual_eff:.2f} km/kWh")
print(f"Rekomendasi AI Optimizer  -> Waktu: {ai_time_s:.1f} dtk | Energi: {ai_energy_Wh:.2f} Wh | Efisiensi: {ai_eff:.2f} km/kWh")
print("="*65)

# Simpan panduan strategi ke CSV untuk dibaca tim & driver
track_df.to_csv('panduan_strategi_driver_per_10m.csv', index=False)
print("Tabel panduan titik injak & lepas gas berhasil disimpan ke 'panduan_strategi_driver_per_10m.csv'!")

# Visualisasi Peta Sirkuit & Grafik Kecepatan
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))
colors = np.where(track_df['ai_throttle_pct'] > 0, 'red', 'dodgerblue')
ax1.scatter(track_df['lng'], track_df['lat'], c=colors, s=25)
ax1.set_title('Peta Sirkuit: Titik Pulse (Merah) vs Glide (Biru)')
ax1.set_xlabel('Longitude'); ax1.set_ylabel('Latitude'); ax1.grid(True, alpha=0.3)

ax2.plot(track_df['dist_m'], track_df['driver_speed'], label='Kecepatan Aktual Driver (km/jam)', color='gray', alpha=0.7)
ax2.plot(track_df['dist_m'], track_df['ai_speed_kmh'], label='Kecepatan Optimal AI (km/jam)', color='red', linewidth=2)
ax2.set_title('Profil Kecepatan Pulse-and-Glide Sepanjang 1 Lap (1.520 m)')
ax2.set_xlabel('Jarak dari Garis Start (Meter)'); ax2.set_ylabel('Kecepatan (km/jam)')
ax2.legend(); ax2.grid(True, alpha=0.3)
plt.tight_layout()
plt.savefig('hasil_optimasi_sirkuit.png', dpi=150)
plt.show()