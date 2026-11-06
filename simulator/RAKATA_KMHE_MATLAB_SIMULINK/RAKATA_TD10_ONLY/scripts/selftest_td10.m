% Native MATLAB and Simulink compilation/integration test; writes no field-validity claim.
C=kmhe_config;Q=load(fullfile(C.output,'vehicle_TD10.mat'));M=Q.M;T=kmhe_track(C);P=C.zones;
assert(isequal(sort(M.trained_laps),C.train_laps));assert(isempty(intersect(M.trained_laps,M.heldout_laps)));
assert(all(T.speed_cap>=20-1e-10),'UNEJ corner reference lost');
[a1,p1]=kmhe_rates(5,.8,100,0,M,false,C);[a2,p2]=kmhe_rates(5,.8,900,0,M,false,C);
assert(abs(a1-a2)<1e-10&&abs(p1-p2)<1e-10,'Sport Jabar spatial terms leaked into UNEJ');
% Mechanical fixture tests event logic with zero coasting loss and ample traction.
F=M;F.acceleration_coefficients=zeros(16,1);F.acceleration_coefficients(3:8)=1;
F.power_coefficients(:)=400;T.grade(:)=0;T.speed_cap(:)=35.25;C.limit_s=3000;C.laps=6;
x=kmhe_initial(F);x(3)=1;
for i=1:60000
 x=kmhe_step(x,[100;0],.05,C,F,T,P);if x(12),break;end
end
assert(x(13)==0&&abs(x(2)-9600)<1e-6&&x(11)==6,'Six-lap / stop logic failed');
assert(x(3)>0,'Flying finish must retain speed');assert(x(6)>0,'Energy must accumulate');
% Confirm exactly 3s holding and correct nonzero idle power.
x=kmhe_initial(F);x(9)=1;x(8)=C.stop_m;t0=x(1);e0=x(6);
for k=1:60,x=kmhe_step(x,[0;0],.05,C,F,T,P);end
assert(abs(x(1)-t0-3)<1e-8&&x(11)==1&&x(3)==0&&x(6)>e0);
disp('MATLAB event tests PASS. Building Simulink and checking numeric parity...');
run('build_simulink_td10.m');
% Short manual coast run: equivalent MATLAB and Simulink must agree at every sample.
mdl='KMHE_UNEJ_TD10_ONLY';C=kmhe_config;C.limit_s=5;mw=get_param(mdl,'ModelWorkspace');assignin(mw,'KMHE_CFG',C);
set_param([mdl '/Automatic_policy'],'Value','[100;0]');set_param(mdl,'StopTime','5');S=sim(mdl);Y=S.get('telemetry');
x=kmhe_initial(M);Z=zeros(numel(Y.Time),11);
for k=1:numel(Y.Time)
 Z(k,:)=[x(3)*3.6,x(2),x(14),x(6),x(5)/M.voltage_V,M.voltage_V,x(7),x(10),x(12),x(13),x(11)];
 x=kmhe_step(x,[100;0],C.dt,C,M,kmhe_track(C),P);
end
assert(max(abs(Y.Data(:)-Z(:)))<1e-7,'Simulink/MATLAB parity failed');
% Exercise manual source beyond its last data point, including abrupt release.
assert(strcmp(get_param([mdl '/Manual_input'],'OutputAfterFinalValue'),'Holding final value'));
manual=[0 0 0;1 100 0;2 0 0];assignin(mw,'manual_input',manual);
set_param([mdl '/Auto_or_manual'],'sw','0');S=sim(mdl);Y=S.get('telemetry');
x=kmhe_initial(M);Z=zeros(numel(Y.Time),11);T=kmhe_track(C);
for k=1:numel(Y.Time)
 Z(k,:)=[x(3)*3.6,x(2),x(14),x(6),x(5)/M.voltage_V,M.voltage_V,x(7),x(10),x(12),x(13),x(11)];
 j=find(manual(:,1)<=Y.Time(k)+1e-10,1,'last');
 x=kmhe_step(x,manual(j,2:3)',C.dt,C,M,T,P);
end
assert(max(abs(Y.Data(:)-Z(:)))<1e-7,'Manual input hold/release parity failed');
Rlog=kmhe_log_table(Y,C);assert(all(Rlog.throttle_pct(Rlog.time_s>2.2)==0));
close_system(mdl,0);disp('Native MATLAB + Simulink parity PASS');
