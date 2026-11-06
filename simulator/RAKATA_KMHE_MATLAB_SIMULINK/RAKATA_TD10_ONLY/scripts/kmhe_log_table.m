function R=kmhe_log_table(Y,C)
% The first 11 channels follow kmhe_sfun. Use actual lap state at boundaries.
D=squeeze(Y.Data);t=Y.Time(:);
if size(D,1)~=numel(t)&&size(D,2)==numel(t),D=D';end
assert(size(D,1)==numel(t)&&size(D,2)==11&&all(isfinite(D),'all'),...
 'Unexpected Simulink telemetry shape. Rebuild the current model.');
R=array2table(D,'VariableNames',{'speed_kmh','distance_m','throttle_pct',...
 'energy_Wh','current_A','voltage_V','lap','hold_s','done','invalid','stop_count'});
R.time_s=t;R.power_W=R.current_A.*R.voltage_V;
R.lap_distance_m=max(0,min(C.length_m,R.distance_m-(R.lap-1)*C.length_m));
end
