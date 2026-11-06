function kmhe_plot(R,T,C,label)
if nargin<4,label='simulation';end
f=figure('Color','w','Name',label,'Position',[80 80 1250 800]);tiledlayout(3,2);
nexttile;plot(R.time_s,R.speed_kmh);ylabel('km/h');xlabel('Time s');grid on;
nexttile;stairs(R.distance_m,R.throttle_pct);ylabel('Throttle %');xlabel('Total distance m');grid on;
nexttile;plot(R.time_s,R.energy_Wh);ylabel('Wh');xlabel('Time s');grid on;
nexttile;yyaxis left;plot(R.time_s,R.current_A);ylabel('A');yyaxis right;plot(R.time_s,R.voltage_V);ylabel('V');grid on;
nexttile;plot(T.s,T.raw_elevation,'--',T.s,T.elevation);ylabel('Elevation m');xlabel('Lap station m');legend('Raw DEM','Closed-lap correction');grid on;
nexttile;lat=interp1(T.s,T.lat,min(C.length_m,R.lap_distance_m));lon=interp1(T.s,T.lng,min(C.length_m,R.lap_distance_m));scatter((lon-T.lng(1))*111195*cosd(T.lat(1)),(lat-T.lat(1))*111195,8,R.throttle_pct,'filled');axis equal;colorbar;clim([0 100]);xlabel('East m');ylabel('North m');title('Throttle location (all laps)');
axs=findall(f,'Type','axes');for j=1:numel(axs),axs(j).Toolbar.Visible='off';end;drawnow;
exportgraphics(f,fullfile(C.output,[label '.png']),'Resolution',180);savefig(f,fullfile(C.output,[label '.fig']));
kmhe_throttle_map(R,T,C,label);
end
