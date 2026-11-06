function R=kmhe_simulate(P,C,M,T,manual)
if nargin<5,manual=[];end
assert(C.mass_kg>0&&C.dt>0&&ismember(C.laps,[1 6])&&C.limit_s>0,'Invalid physical/session configuration');
assert(isequal(size(P),[4 4])&&all(isfinite(P),'all')&&all(P(:,1)<P(:,2))&&...
 all(P(:,1)>=0&P(:,2)<=C.length_m)&&all(P(1:3,2)<=P(2:4,1))&&...
 all(P(:,3)>=0&P(:,3)<=100)&&all(P(:,4)>0&P(:,4)<=C.max_speed_kmh),...
 'Invalid zones: require ordered non-overlapping [start_m release_m throttle_pct speed_kmh] within track and vehicle limits');
if ~isempty(manual),assert(size(manual,2)==3&&all(isfinite(manual),'all')&&all(diff(manual(:,1))>0),'Manual input must be increasing [time_s throttle_pct brake_0_1]');end
x=kmhe_initial(M);Z=zeros(ceil(C.limit_s/C.dt)+C.laps*5+20,17);Z(1,:)=x';k=1;
while x(12)==0&&k<size(Z,1)
 input=[-1;0];if ~isempty(manual),input=interp1(manual(:,1),manual(:,2:3),x(1),'previous','extrap')';end
 x=kmhe_step(x,input,C.dt,C,M,T,P);k=k+1;Z(k,:)=x';
end
Z=Z(1:k,:);R=array2table(Z,'VariableNames',{'time_s','distance_m','speed_mps','effective_throttle','power_W','energy_Wh','lap','lap_distance_m','stop_state','hold_s','stop_count','done','invalid','throttle_pct','latch','relaunch_time','max_speed_kmh'});
R.speed_kmh=R.speed_mps*3.6;R.voltage_V=repmat(M.voltage_V,k,1);R.current_A=R.power_W/M.voltage_V;
end
