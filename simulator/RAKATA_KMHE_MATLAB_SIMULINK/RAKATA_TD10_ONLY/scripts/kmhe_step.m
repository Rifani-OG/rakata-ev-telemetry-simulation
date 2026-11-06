function x=kmhe_step(x,input,dt,C,M,T,P)
% Shared discrete plant: MATLAB optimizer and Simulink call exactly this function.
if x(12)>0,return;end
dt=min(dt,max(0,C.limit_s-x(1)));if dt<=1e-10,x(12)=1;x(13)=1;return;end
requestedDt=dt;
if input(1)<0,[u,x]=kmhe_policy(x,P,C);else,u=min(100,max(0,input(1)));end
brake=min(1,max(0,input(2)));oldp=x(5);
if x(9)==1
 h=min(dt,C.hold_s-x(10));pnew=M.idle_W+(oldp-M.idle_W)*exp(-h/M.power_tau_s);
 x(6)=x(6)+(M.idle_W*h+(oldp-M.idle_W)*M.power_tau_s*(1-exp(-h/M.power_tau_s)))/3600;
 x(1)=x(1)+h;x(5)=pnew;x(3)=0;x(4)=0;x(14)=0;x(10)=x(10)+h;
 if x(10)>=C.hold_s-1e-8
  x(9)=2;x(11)=x(11)+1;x(16)=x(1);
  if dt-h>1e-9,x=kmhe_step(x,input,dt-h,C,M,T,P);end
 end
 return;
end
v=x(3);s=x(8);remain=C.stop_m-s;
% Anticipate corners using a braking-distance envelope, never force a minimum speed.
look=(s:5:min(C.length_m,s+160))';caps=interp1(T.s,T.speed_cap,look)/3.6;
allowed=min(sqrt(caps.^2+2*C.brake_mps2*(look-s)));
if v>allowed,brake=1;end
if x(9)==0&&remain<=v*v/(2*C.brake_mps2)+v*dt+.02,brake=1;end
if brake>0,u=0;x(4)=0;end
grade=interp1(T.s,T.grade,min(C.length_m,s));[a,desired]=kmhe_rates(v,x(4),s,grade,M,false,C);
if brake>0
 if x(9)==0&&remain>0&&remain<=v*v/(2*C.brake_mps2)+v*dt+.02
  a=min(a,-min(C.brake_mps2,v*v/(2*max(.001,remain))));
 else,a=min(a,-C.brake_mps2*brake);end
end
if v<=0&&a<0,a=0;end
vn=max(0,v+a*dt);ds=(v+vn)*dt/2;
if x(9)==0&&remain>=0&&ds>=remain&&ds>0
 % Only snap an already-nearly-stopped vehicle. A fast crossing is invalid.
 if vn>.10,x(13)=1;x(12)=1;end
 ds=remain;vn=0;x(9)=1;x(10)=0;x(4)=0;u=0;
elseif x(9)==0&&remain>=0&&remain<.02&&vn<.03
 ds=remain;vn=0;x(9)=1;x(10)=0;x(4)=0;u=0;
elseif x(9)==0&&remain<0
 x(13)=1;x(12)=1;
end
% Avoid asymptotic undershoot: commanded braking before stop follows exact stop distance.
if x(9)==0&&brake>0&&remain>0&&vn==0&&remain>.02
 % A true early stop stays early; next positive throttle is allowed to approach M9.
end
if s+ds>=C.length_m
 dsLeft=C.length_m-s;
 if abs(a)>1e-10,dt=2*dsLeft/max(eps,v+sqrt(max(0,v*v+2*a*dsLeft)));else,dt=dsLeft/max(v,eps);end
 dt=min(requestedDt,max(0,dt));vn=max(0,v+a*dt);ds=dsLeft;
end
pnew=oldp+(desired-oldp)*(1-exp(-dt/M.power_tau_s));
x(6)=x(6)+(oldp+pnew)*dt/7200;x(5)=pnew;x(1)=x(1)+dt;x(2)=x(2)+ds;x(8)=s+ds;x(3)=vn;x(14)=u;
x(4)=x(4)+(u/100-x(4))*(1-exp(-dt/M.throttle_tau_s));x(17)=max(x(17),vn*3.6);
if x(8)>=C.length_m-1e-8
 if x(9)~=2,x(13)=1;x(12)=1;end
 if x(7)>=C.laps,x(12)=1;else,x(7)=x(7)+1;x(8)=0;x(9)=0;x(10)=0;x(15)=0;end
end
if x(1)>=C.limit_s-1e-8,x(12)=1;if x(2)<C.length_m*C.laps-.01,x(13)=1;end,end
if requestedDt-dt>1e-9&&x(12)==0,x=kmhe_step(x,input,requestedDt-dt,C,M,T,P);end
end
