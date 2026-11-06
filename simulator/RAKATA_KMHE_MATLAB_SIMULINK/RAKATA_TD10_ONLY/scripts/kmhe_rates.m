function [a,p]=kmhe_rates(v,u,s,grade,M,useSpatial,C)
% v m/s, u 0..1. Geografi Sport Jabar hanya pada validasi Sport Jabar.
[X,q,H]=kmhe_features(v*3.6,u,s,C);
if ~useSpatial,X(:,9:16)=0;end
b=M.acceleration_coefficients(:);a=(X*b)*(C.training_mass_kg/C.mass_kg)-9.81*grade;
p=M.idle_W+(H*M.power_coefficients(:))*q;
end
