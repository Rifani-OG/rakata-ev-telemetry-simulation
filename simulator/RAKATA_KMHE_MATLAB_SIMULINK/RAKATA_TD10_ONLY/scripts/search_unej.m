C=kmhe_config;Q=load(fullfile(C.output,'vehicle_TD10.mat'));M=Q.M;T=kmhe_track(C);
Q=load(fullfile(C.output,'validation_gate.mat'));
gate=Q.gate;
if ~Q.gate.pass&&~C.allow_unvalidated_search
 error('Validation gate failed. Inspect validation_matlab.csv. To run an EXPLORATORY search, set C.allow_unvalidated_search=true in kmhe_config.m.');
end
if ~gate.pass,warning('KMHE:Exploratory','TD10 validation not passed: UNEJ search is exploratory, not a field-validated optimum.');end
rng(C.seed);bestP=C.zones;best=Inf;bestFeasible=false;history=zeros(C.search_trials,8);Cfast=C;Cfast.dt=.2;
% Bounds preserve four ordered, non-overlapping track zones, including mandatory M9.
lo=[0 80 95 30;340 410 60 18;665 820 90 26;1150 1280 95 28];
hi=[0 250 100 35.25;440 600 100 26;665 1100 100 35.25;1260 1500 100 35.25];
for k=1:C.search_trials
 if k==1,P=C.zones;elseif rand<.25,P=lo+rand(4,4).*(hi-lo);else,P=min(hi,max(lo,bestP+randn(4,4).*(hi-lo)*.15));end
 P=kmhe_project_zones(P,lo,hi);
 R=kmhe_simulate(P,Cfast,M,T);missing=max(0,C.length_m*C.laps-R.distance_m(end));over=max(0,max(R.speed_kmh)-C.max_speed_kmh);
 J=R.energy_Wh(end)+1000*missing+1e5*R.invalid(end)+1e4*over;
 candidateFeasible=R.invalid(end)==0&&R.stop_count(end)==C.laps&&missing<=.01&&R.time_s(end)<=C.limit_s&&over<=.01;
 if candidateFeasible,J=R.energy_Wh(end);end
 if (candidateFeasible&&~bestFeasible)||(candidateFeasible==bestFeasible&&J<best)
  best=J;bestP=P;bestFeasible=candidateFeasible;bestMissing=missing;bestWh=R.energy_Wh(end);
 end
 history(k,:)=[k,J,R.time_s(end),R.energy_Wh(end),missing,R.stop_count(end),R.invalid(end),candidateFeasible];
 if mod(k,25)==0||k==C.search_trials
  rngState=rng;save(fullfile(C.output,'search_checkpoint.mat'),'bestP','best','history','C','M','k','rngState','bestFeasible');
  fprintf('%d/%d | BEST feasible=%d | missing %.1f m | %.3f Wh\n',k,C.search_trials,bestFeasible,bestMissing,bestWh);
 end
end
writetable(array2table(history,'VariableNames',{'trial','score','time_s','energy_Wh','missing_m','stops','invalid','feasible'}),fullfile(C.output,'search_history.csv'));
Cfine=C;Cfine.dt=.05;R=kmhe_simulate(bestP,Cfine,M,T);
feasible=R.invalid(end)==0&&R.stop_count(end)==C.laps&&R.distance_m(end)>=C.length_m*C.laps-.01&&R.time_s(end)<=C.limit_s&&max(R.speed_kmh)<=C.max_speed_kmh+.01;
name='candidate_NOT_FEASIBLE';if feasible,name='candidate_FEASIBLE_MODEL_ONLY';end
writetable(array2table(bestP,'VariableNames',{'start_m','release_m','throttle_pct','speed_limit_kmh'}),fullfile(C.output,[name '_zones.csv']));writetable(R,fullfile(C.output,[name '.csv']));
kmhe_plot(R,T,Cfine,name);save(fullfile(C.output,'search_result.mat'),'bestP','R','feasible','Cfine','C','M','T','gate');
kmhe_export(R,T,Cfine,name);
kmhe_diagnose_run(R,Cfine,T,bestP,name);
fprintf('Feasible=%d | %.2f s | %.3f Wh | %.1f m | %d stops\n',feasible,R.time_s(end),R.energy_Wh(end),R.distance_m(end),R.stop_count(end));
if ~feasible
 fprintf('NOT FEASIBLE: low Wh from an unfinished attempt is not an efficiency result.\n');
end
fprintf('Next: run("run_unej_simulink.m") for Simulink telemetry and throttle maps.\n');
