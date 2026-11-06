function C=kmhe_config()
% Satu tempat untuk input. Jalankan skrip dari folder scripts.
C.root=fileparts(fileparts(mfilename('fullpath')));
C.source=fullfile(C.root,'data','TD10_latest.xlsx');
C.output=fullfile(C.root,'results');
C.mass_kg=141;                  % 71 kg mobil + 70 kg driver: input pengguna
C.ratio=11;                     % Tetap 1:11; tidak dipakai sebagai pengali gaya ganda
C.training_mass_kg=141;
C.voltage_V=54;                 % Diganti median telemetry saat pelatihan
C.dt=.1; C.laps=6; C.limit_s=1500;
C.length_m=1600; C.stop_m=665; C.hold_s=3;
C.brake_mps2=.65;               % ASUMSI, belum uji pengereman
C.lateral_mps2=1.5;             % ASUMSI konservatif; studi 3.0 harus validasi grip
C.corner_cap_floor_kmh=20;      % Acuan pengguna UNEJ, bukan speed minimum paksa/grip terukur
C.max_speed_kmh=35.25; C.grade_scale=1;
C.throttle_tau_s=.3; C.power_tau_s=2; % ASUMSI respons efektif, bukan sensor langsung
C.no_load_kmh=35.7; C.q_exponent=2;
C.training_length_m=1440;
C.train_laps=[1 4 5 7 8 10 13]; C.test_laps=[3 6 12 15];
C.max_gap_s=.5; C.seed=10; C.search_trials=300;
C.max_time_error_s=10; C.max_speed_rmse_kmh=3; C.max_energy_mae_Wh=.5;
C.allow_unvalidated_search=true; % Studi transfer TD10->UNEJ diminta pengguna; status validasi tetap dilaporkan
C.zones=[0 100 100 35;390 455 100 22;665 895 100 35;1185 1390 100 35];
C.launch_after_stop_until_m=760; C.launch_after_stop_pct=45; C.launch_after_stop_kmh=20;
if ~exist(C.output,'dir'),mkdir(C.output);end
end
