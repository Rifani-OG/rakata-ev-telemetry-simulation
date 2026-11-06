function R = kmhe_simulate(P,C,T)
% P rows: [start_m end_m throttle_pct target_speed_kmh], repeated each lap.
N=ceil(C.attempt_limit_s/C.dt)+1; time=zeros(N,1);distance=zeros(N,1);lapDistance=zeros(N,1);
speed=zeros(N,1);throttle=zeros(N,1);power=zeros(N,1);energy=zeros(N,1);lap=ones(N,1);stopCount=0;holding=0;k=1;
while k<N && lap(k)<=C.laps
 s=lapDistance(k); v=speed(k); u=0;
 if holding>0
  holding=max(0,holding-C.dt); v2=0; ds=0; p=C.idle_power_W;
 else
  active=find(s>=P(:,1)&s<P(:,2),1,'first');
  if ~isempty(active) && v*3.6<P(active,4),u=P(active,3)/100;end
  grade=interp1(T.distance_m,T.grade,s,'linear','extrap');
  Froll=C.mass_kg*9.81*C.Crr; Faero=.5*C.air_density*C.CdA_m2*v^2;
  if ~isempty(C.calibration)
   af=interp1(C.calibration.speed_kmh,C.calibration.accel_full_mps2,v*3.6,'linear','extrap'); ac=interp1(C.calibration.speed_kmh,C.calibration.coast_mps2,v*3.6,'linear','extrap'); pf=interp1(C.calibration.speed_kmh,C.calibration.power_full_W,v*3.6,'linear','extrap'); Pelec=C.idle_power_W+u*max(0,pf-C.idle_power_W); a=ac+u*(af-ac)-9.81*grade;
  else
   Pelec=C.idle_power_W+u*(C.max_electrical_power_W-C.idle_power_W);Fdrive=max(0,(Pelec-C.idle_power_W)*C.drivetrain_efficiency/max(v,2));a=(Fdrive-Froll-Faero-C.mass_kg*9.81*grade)/C.mass_kg;
  end
  v2=max(0,v+a*C.dt); ds=(v+v2)/2*C.dt; p=Pelec;
  if stopCount<lap(k) && s<C.stop_m && s+ds>=C.stop_m
   ds=C.stop_m-s;v2=0;holding=C.stop_s;stopCount=stopCount+1;
  end
 end
 time(k+1)=time(k)+C.dt;distance(k+1)=distance(k)+ds;lapDistance(k+1)=s+ds;speed(k+1)=v2;throttle(k+1)=u*100;power(k+1)=p;energy(k+1)=energy(k)+p*C.dt/3600;lap(k+1)=lap(k);
 if lapDistance(k+1)>=C.track_length_m
  if lap(k)>=C.laps,k=k+1;break;end
  lap(k+1)=lap(k)+1;lapDistance(k+1)=lapDistance(k+1)-C.track_length_m;
 end
 k=k+1;
end
R=table(time(1:k),distance(1:k),lap(1:k),lapDistance(1:k),speed(1:k)*3.6,throttle(1:k),power(1:k),energy(1:k),'VariableNames',{'time_s','distance_m','lap','lap_distance_m','speed_kmh','throttle_pct','power_W','energy_Wh'});
R.finished=repmat(R.distance_m(end)>=C.laps*C.track_length_m-0.1,height(R),1); R.current_A=R.power_W/C.voltage_V; R.voltage_V=repmat(C.voltage_V,height(R),1);
end
