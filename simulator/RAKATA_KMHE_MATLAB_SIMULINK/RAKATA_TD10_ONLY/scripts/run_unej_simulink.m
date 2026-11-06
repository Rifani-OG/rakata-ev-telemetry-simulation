% Execute the searched candidate in Simulink, then map actual block telemetry.
run('build_simulink_td10.m');
candidateFile=fullfile(C.output,'search_result.mat');
assert(isfile(candidateFile),'Run search_unej.m first.');
candidate=load(candidateFile);
assert(isfield(candidate,'C')&&isfield(candidate,'M'),'Old search result: rerun search_unej.m.');
assert(isequaln(candidate.C,C)&&isequaln(candidate.M,M)&&isequaln(candidate.T,T),...
 'Configuration, training or track changed. Rerun search_unej.m.');
C=candidate.Cfine;P=candidate.bestP;
assignin(mw,'KMHE_CFG',C);assignin(mw,'KMHE_POLICY',P);
set_param([model '/Auto_or_manual'],'sw','1');
set_param(model,'FixedStep',num2str(C.dt),'StopTime',num2str(C.limit_s+C.dt));
save_system(model,out);
S=sim(model);Y=S.get('telemetry');
R=kmhe_log_table(Y,C);
feasible=R.done(end)>0&&R.invalid(end)==0&&R.stop_count(end)==C.laps&&...
 R.distance_m(end)>=C.length_m*C.laps-.01&&R.time_s(end)<=C.limit_s+C.dt&&...
 max(R.speed_kmh)<=C.max_speed_kmh+.01;
name='simulink_UNEJ_NOT_FEASIBLE';
if feasible,name='simulink_UNEJ_FEASIBLE_MODEL_ONLY';end
writetable(R,fullfile(C.output,[name '.csv']));
kmhe_plot(R,T,C,name);kmhe_export(R,T,C,name);
kmhe_diagnose_run(R,C,T,P,name);
save(fullfile(C.output,'simulink_unej_result.mat'),'R','C','P','T','M','feasible');
fprintf('Simulink: feasible=%d | %.2f s | %.3f Wh | %.1f m | %d stops\n',...
 feasible,R.time_s(end),R.energy_Wh(end),R.distance_m(end),R.stop_count(end));
fprintf('Throttle map: %s\n',fullfile(C.output,[name '_map_per_lap.png']));
