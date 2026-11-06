function [u,x]=kmhe_policy(x,P,C)
% Four zones; each pulse is latched off at its upper speed until the next lap.
s=x(8);v=x(3)*3.6;u=0;
if x(9)==1,return;end
for j=1:4
 if s<P(j,1)||s>=P(j,2),continue;end
 if j==3&&x(9)~=2,return;end
 if j==3&&s<C.launch_after_stop_until_m
  if v<C.launch_after_stop_kmh,u=min(C.launch_after_stop_pct,max(0,(x(1)-x(16))/3*C.launch_after_stop_pct));end
  return;
 end
 if v>=P(j,4),x(15)=double(bitset(uint32(x(15)),j,1));end
 if bitget(uint32(x(15)),j)==0,u=P(j,3);end
 if x(7)==1&&j==1,u=min(u,max(0,(x(1)-1)/3*100));end
 return;
end
end
