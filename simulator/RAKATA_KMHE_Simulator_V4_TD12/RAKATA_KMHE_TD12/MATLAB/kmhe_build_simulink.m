C=kmhe_config;mdl='KMHE_UNEJ_Longitudinal';if bdIsLoaded(mdl),close_system(mdl,0);end;new_system(mdl);open_system(mdl);
add_block('simulink/Sources/From Workspace',[mdl '/Throttle'], 'VariableName','throttle_command');
add_block('simulink/Continuous/Integrator',[mdl '/Speed']);add_block('simulink/Continuous/Integrator',[mdl '/Distance']);add_block('simulink/Math Operations/Gain',[mdl '/mps_to_kmh'],'Gain','3.6');
add_block('simulink/Sinks/To Workspace',[mdl '/speed_kmh'],'VariableName','speed_kmh_sim','SaveFormat','Structure With Time');add_block('simulink/Sinks/To Workspace',[mdl '/distance_m'],'VariableName','distance_m_sim','SaveFormat','Structure With Time');
add_block('simulink/Ports & Subsystems/Subsystem',[mdl '/Vehicle_Physics']);
add_line(mdl,'Throttle/1','Vehicle_Physics/1');add_line(mdl,'Vehicle_Physics/1','Speed/1');add_line(mdl,'Speed/1','Distance/1');add_line(mdl,'Speed/1','mps_to_kmh/1');add_line(mdl,'mps_to_kmh/1','speed_kmh/1');add_line(mdl,'Distance/1','distance_m/1');
set_param(mdl,'StopTime',num2str(C.attempt_limit_s),'Solver','ode4','FixedStep',num2str(C.dt));save_system(mdl,fullfile(fileparts(mfilename('fullpath')),[mdl '.slx']));
fprintf('Model kerangka dibuat: %s.slx. Vehicle_Physics disiapkan untuk penggantian dengan lookup TD10 terkalibrasi.\n',mdl);
