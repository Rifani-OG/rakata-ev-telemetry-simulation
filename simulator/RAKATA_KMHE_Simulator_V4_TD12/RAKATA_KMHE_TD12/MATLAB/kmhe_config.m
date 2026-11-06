function C = kmhe_config()
C.mass_kg = 141; C.ratio = 11; C.voltage_V = 54;
C.track_length_m = 1600; C.stop_m = 665; C.stop_s = 3;
C.laps = 6; C.attempt_limit_s = 1500; C.speed_limit_kmh = 35.3;
C.dt = 0.1; C.idle_power_W = 6.9; C.brake_decel_mps2 = 0.65;
C.Crr = 0.0172; C.CdA_m2 = 0.15; C.air_density = 1.18;
C.drivetrain_efficiency = 0.82; C.max_electrical_power_W = 850;
C.calibration_file = fullfile(fileparts(mfilename('fullpath')),'data','vehicle_calibration.mat');
if isfile(C.calibration_file),Q=load(C.calibration_file);C.calibration=Q.calibration;else,C.calibration=[];end
C.track_file = fullfile(fileparts(mfilename('fullpath')),'data','kmhe_unej_track.csv');
C.result_dir = fullfile(fileparts(mfilename('fullpath')),'results');
end
