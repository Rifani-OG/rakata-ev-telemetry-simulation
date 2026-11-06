function V=kmhe_validate(C,M,runs)
V=table;held=runs(~[runs.isTrain]);
for j=1:numel(held)
 r=held(j);n=numel(r.t);v=zeros(n,1);p=v;e=v;freeS=v;v(1)=r.v(1)/3.6;p(1)=r.p(1);u=r.u(1);
 % Speed recursion with measured station: stronger than one-step but not free position rollout.
 for k=1:n-1
  [a,desired]=kmhe_rates(v(k),u,r.s(k),r.grade(k),M,true,C);v(k+1)=max(0,v(k)+.1*a);p(k+1)=p(k)+(desired-p(k))*(1-exp(-.1/M.power_tau_s));e(k+1)=e(k)+(p(k)+p(k+1))*.05/3600;u=u+(r.u(k)-u)*(1-exp(-.1/M.throttle_tau_s));
 end
 measuredRMSE=sqrt(mean((v*3.6-r.v).^2));actualE=trapz(r.t,r.p)/3600;
 G=jsondecode(fileread(fullfile(C.root,'data','sport_jabar_geography.json')));vf=r.v(1)/3.6;uu=r.u(1);
 for k=1:n-1
  g=interp1(G.s,G.grade,min(1440,freeS(k)));[a,~]=kmhe_rates(vf,uu,min(1440,freeS(k)),g,M,true,C);vn=max(0,vf+.1*a);freeS(k+1)=freeS(k)+(vf+vn)*.05;vf=vn;uu=uu+(r.u(k)-uu)*(1-exp(-.1/M.throttle_tau_s));
 end
 idx=find(freeS>=1440,1);if isempty(idx),timeError=NaN;else,timeError=r.t(idx)-r.t(end);end
 row=table(r.lap,measuredRMSE,actualE,e(end),e(end)-actualE,freeS(end)-1440,timeError,'VariableNames',{'lap','speed_RMSE_kmh','real_Wh','predicted_Wh','error_Wh','free_distance_error_m','free_finish_time_error_s'});V=[V;row]; %#ok<AGROW>
 f=figure('Color','w','Name',sprintf('Heldout lap %d',r.lap));tiledlayout(3,1);
 nexttile;plot(r.t,r.v,r.t,v*3.6);ylabel('Speed km/h');legend('TD10 held-out','Recursive model');grid on;
 nexttile;plot(r.t,r.p,r.t,p);ylabel('Power W');legend('TD10','Model');grid on;
 nexttile;stairs(r.t,r.u*100);ylabel('Throttle %');xlabel('Time s');grid on;
 axs=findall(f,'Type','axes');for j=1:numel(axs),axs(j).Toolbar.Visible='off';end;drawnow;
 exportgraphics(f,fullfile(C.output,sprintf('validation_lap_%d.png',r.lap)),'Resolution',180);
end
writetable(V,fullfile(C.output,'validation_matlab.csv'));disp(V);
gate=struct('pass',all(isfinite(V.free_finish_time_error_s))&&max(abs(V.free_finish_time_error_s))<=C.max_time_error_s&&max(V.speed_RMSE_kmh)<=C.max_speed_rmse_kmh&&mean(abs(V.error_Wh))<=C.max_energy_mae_Wh);
save(fullfile(C.output,'validation_gate.mat'),'gate','V');
fprintf('Validation gate: %d. UNEJ remains unvalidated even if this gate passes.\n',gate.pass);
end
