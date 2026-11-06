function kmhe_export(R,T,C,name)
% Simulator export compatible with 12-column TD10 format; simulated GPS, sat=0.
lat=interp1(T.s,T.lat,min(C.length_m,R.lap_distance_m));lng=interp1(T.s,T.lng,min(C.length_m,R.lap_distance_m));
t=datetime('now','TimeZone','UTC')+seconds(R.time_s);t.Format='yyyy-MM-dd''T''HH:mm:ss.SSS''Z''';
D=table(string(t),lat,lng,R.speed_kmh,zeros(height(R),1),R.throttle_pct,R.current_A*1000,R.voltage_V,R.power_W,R.energy_Wh,R.distance_m/1000,round(R.time_s*1000),...
 'VariableNames',{'timestamp','lat','lng','speed','sat','throttle','current_mA','voltage','power','energy','distance','millis'});
writetable(D,fullfile(C.output,[name '_TD10.csv']),'WriteVariableNames',false);
end
