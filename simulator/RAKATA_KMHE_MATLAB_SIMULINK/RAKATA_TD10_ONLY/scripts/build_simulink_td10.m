% Connected model using the exact same step function as the optimizer.
C=kmhe_config;assert(isfile(fullfile(C.output,'vehicle_TD10.mat')),'Run run_td10_only.m first.');
Q=load(fullfile(C.output,'vehicle_TD10.mat'));M=Q.M;T=kmhe_track(C);P=C.zones;
model='KMHE_UNEJ_TD10_ONLY';out=fullfile(C.output,[model '.slx']);
if bdIsLoaded(model),close_system(model,0);end
if isfile(out),copyfile(out,[out '.previous']);end
new_system(model);mw=get_param(model,'ModelWorkspace');
assignin(mw,'KMHE_CFG',C);assignin(mw,'KMHE_MODEL',M);assignin(mw,'KMHE_TRACK',T);assignin(mw,'KMHE_POLICY',P);
% Editable manual timeseries: time, throttle %, brake fraction. -1 throttle selects policy.
manual=[0 0 0;1 0 0;4 100 0;12 0 0;C.limit_s 0 0];assignin(mw,'manual_input',manual);
add_block('simulink/Sources/Constant',[model '/Automatic_policy'],'Value','[-1;0]','Position',[35 70 125 110]);
add_block('simulink/Sources/From Workspace',[model '/Manual_input'],'VariableName','manual_input','Interpolate','off','OutputAfterFinalValue','Holding final value','SampleTime','KMHE_CFG.dt','ZeroCross','off','Position',[35 160 125 205]);
add_block('simulink/Signal Routing/Manual Switch',[model '/Auto_or_manual'],'sw','1','Position',[180 95 225 175]);
add_block('simulink/User-Defined Functions/Level-2 MATLAB S-Function',[model '/Vehicle_and_race'],'FunctionName','kmhe_sfun','Parameters','KMHE_CFG,KMHE_MODEL,KMHE_TRACK,KMHE_POLICY','Position',[285 85 470 190]);
add_block('simulink/Signal Routing/Demux',[model '/Metrics'],'Outputs','11','Position',[535 35 540 540]);
add_block('simulink/Sinks/To Workspace',[model '/Telemetry'],'VariableName','telemetry','SaveFormat','Timeseries','Position',[510 580 630 610]);
labels={'Speed_kmh','Distance_m','Throttle_pct','Energy_Wh','Current_A','Voltage_V','Lap','Hold_elapsed_s','Done','Invalid','Stop_count'};
for i=1:11
 add_block('simulink/Sinks/Display',[model '/' labels{i}],'Position',[605 25+46*(i-1) 755 55+46*(i-1)]);
 add_line(model,sprintf('Metrics/%d',i),[labels{i} '/1']);
end
add_block('simulink/Sinks/Scope',[model '/Dashboard_scope'],'Position',[820 65 950 130]);
add_block('simulink/Sinks/Stop Simulation',[model '/Finish_stop'],'Position',[830 390 945 425]);
add_line(model,'Automatic_policy/1','Auto_or_manual/1');add_line(model,'Manual_input/1','Auto_or_manual/2');add_line(model,'Auto_or_manual/1','Vehicle_and_race/1');
add_line(model,'Vehicle_and_race/1','Metrics/1');add_line(model,'Vehicle_and_race/1','Telemetry/1');add_line(model,'Vehicle_and_race/1','Dashboard_scope/1');add_line(model,'Metrics/9','Finish_stop/1');
set_param(model,'SolverType','Fixed-step','Solver','FixedStepDiscrete','FixedStep',num2str(C.dt),'StopTime',num2str(C.limit_s+C.dt),'ReturnWorkspaceOutputs','on');
set_param(model,'SimulationCommand','update'); % Compilation gate on user's MATLAB
save_system(model,out);open_system(model);fprintf('Created and compiled: %s\n',out);
fprintf('Run using sim("KMHE_UNEJ_TD10_ONLY"). Double-click Auto_or_manual to choose input.\n');
