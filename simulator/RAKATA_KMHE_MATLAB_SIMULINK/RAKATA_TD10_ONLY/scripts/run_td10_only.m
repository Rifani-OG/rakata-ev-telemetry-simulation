% Entry point: run from scripts. No TD7 or prior model is loaded.
clearvars;C=kmhe_config;[runs,audit,D]=kmhe_prepare(C);M=kmhe_train(C,runs,D);V=kmhe_validate(C,M,runs);
T=kmhe_track(C);R=kmhe_simulate(C.zones,C,M,T);writetable(R,fullfile(C.output,'historical_candidate.csv'));kmhe_plot(R,T,C,'historical_candidate');
kmhe_export(R,T,C,'historical_candidate');
kmhe_diagnose_run(R,C,T,C.zones,'historical_candidate');
fprintf('TD10 ONLY complete. UNEJ trial: %.2f s, %.3f Wh, %.1f/%.1f m, stop %d.\n',R.time_s(end),R.energy_Wh(end),R.distance_m(end),C.length_m*C.laps,R.stop_count(end));
fprintf('Next: run("build_simulink_td10.m"). Optimization: run("search_unej.m").\n');
