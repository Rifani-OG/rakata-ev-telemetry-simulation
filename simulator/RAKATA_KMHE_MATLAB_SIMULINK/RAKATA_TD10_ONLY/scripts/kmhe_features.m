function [X,q,H]=kmhe_features(v,u,s,C)
if nargin<4,C=kmhe_config;end
v=v(:);u=u(:);s=s(:);nodes=[0 7 14 21 28 36];
H=zeros(numel(v),6);vv=min(36,max(0,v));
for j=1:5
 z=vv>=nodes(j)&(vv<nodes(j+1)|j==5);w=(vv(z)-nodes(j))/(nodes(j+1)-nodes(j));
 H(z,j)=1-w;H(z,j+1)=w;
end
z=min(.999,(max(0,v)/C.no_load_kmh).^C.q_exponent);q=min(1,max(0,(u-z)./(1-z)));
F=zeros(numel(v),8);for k=1:4,F(:,2*k-1)=sin(2*pi*k*s/1440);F(:,2*k)=cos(2*pi*k*s/1440);end
X=[ones(numel(v),1),-(v/3.6).^2,H.*q,F];
end
