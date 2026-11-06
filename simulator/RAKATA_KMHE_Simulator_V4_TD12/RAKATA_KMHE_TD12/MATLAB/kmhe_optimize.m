C=kmhe_config;T=kmhe_load_track(C);if ~exist(C.result_dir,'dir'),mkdir(C.result_dir);end
% Four historical zones. Optimizer changes start/end, throttle and target speed.
P0=[0 100 100 35;390 455 100 22;665 895 100 35;1185 1390 100 35];
x0=P0(:);lb=[zeros(4,1);20*ones(4,1);30*ones(4,1);15*ones(4,1)];ub=[1580*ones(4,1);1600*ones(4,1);100*ones(4,1);35.3*ones(4,1)];
obj=@(x)score(reshape(x,4,4),C,T);rng(10);xbest=x0;fbest=obj(xbest);
% Base-MATLAB random + local search; tidak membutuhkan Global Optimization Toolbox.
for k=1:2500
 scale=max(.03,.35*(1-k/2500));candidate=min(ub,max(lb,xbest+scale.*(ub-lb).*randn(size(xbest))));f=obj(candidate);if f<fbest,xbest=candidate;fbest=f;end
end
Pbest=reshape(xbest,4,4);Pbest=sortrows(Pbest,1);R=kmhe_simulate(Pbest,C,T);
writematrix(Pbest,fullfile(C.result_dir,'optimal_throttle_zones.csv'));writetable(R,fullfile(C.result_dir,'optimal_simulation.csv'));
figure('Color','w');tiledlayout(3,1);nexttile;plot(R.distance_m,R.speed_kmh);ylabel('km/h');grid on;nexttile;stairs(R.distance_m,R.throttle_pct);ylabel('Throttle %');grid on;nexttile;plot(R.distance_m,R.energy_Wh);ylabel('Wh');xlabel('Total distance (m)');grid on;exportgraphics(gcf,fullfile(C.result_dir,'optimal_strategy.png'),'Resolution',180);
disp(Pbest);fprintf('Objective %.3f | time %.2f s | energy %.3f Wh | finished %d\n',fbest,R.time_s(end),R.energy_Wh(end),R.finished(end));
function J=score(P,C,T)
 if any(P(:,2)<=P(:,1)),J=1e7+sum(P(:,1)-P(:,2));return,end
 R=kmhe_simulate(P,C,T);miss=max(0,C.laps*C.track_length_m-R.distance_m(end));late=max(0,R.time_s(end)-C.attempt_limit_s);over=max(0,max(R.speed_kmh)-C.speed_limit_kmh);J=R.energy_Wh(end)+1000*miss+100*late+1000*over^2;
end
