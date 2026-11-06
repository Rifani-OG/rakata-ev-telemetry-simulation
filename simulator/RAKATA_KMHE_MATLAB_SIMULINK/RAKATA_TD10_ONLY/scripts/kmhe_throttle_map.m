function kmhe_throttle_map(R,T,C,label)
% Shared by MATLAB search and direct Simulink telemetry exports.
east=(T.lng-T.lng(1))*111195*cosd(T.lat(1));north=(T.lat-T.lat(1))*111195;
f=figure('Color','w','Name',[label ' throttle map'],'Position',[40 40 1400 850]);
if C.laps==1,tiledlayout(1,1);else,tiledlayout(2,3);end
for lap=1:C.laps
 nexttile;plot(east,north,'Color',[.75 .75 .75],'LineWidth',5);hold on;
 q=R.lap==lap;s=max(0,min(C.length_m,R.lap_distance_m(q)));
 scatter(interp1(T.s,east,s),interp1(T.s,north,s),14,R.throttle_pct(q),'filled');
 ix=1:30:numel(T.s)-3;
 quiver(east(ix),north(ix),east(ix+3)-east(ix),north(ix+3)-north(ix),0,'k');
 for j=1:numel(T.markers)
  st=T.markers(j).s*C.length_m/1600;
  text(interp1(T.s,east,st),interp1(T.s,north,st),sprintf(' %d',T.markers(j).n),'FontSize',8);
 end
 xs=interp1(T.s,east,C.stop_m);ys=interp1(T.s,north,C.stop_m);
 plot(xs,ys,'rs','MarkerSize',10,'LineWidth',2);text(xs,ys,'  STOP 3 s','Color','r');
 plot(east(1),north(1),'kp','MarkerSize',12);text(east(1),north(1),'  START/FINISH');
 axis equal;grid on;xlabel('East m');ylabel('North m');clim([0 100]);
 cb=colorbar;cb.Label.String='Throttle %';title(sprintf('Lap %d',lap));
end
sgtitle({strrep(label,'_',' '),'TD10 vehicle model / UNEJ estimated geometry; arrows = travel direction'});
axs=findall(f,'Type','axes');for j=1:numel(axs),axs(j).Toolbar.Visible='off';end;drawnow;
exportgraphics(f,fullfile(C.output,[label '_map_per_lap.png']),'Resolution',180);
savefig(f,fullfile(C.output,[label '_map_per_lap.fig']));
% Actual ON/OFF intervals, not just optimizer zone bounds.
lapNum=[];startM=[];endM=[];peakPct=[];startS=[];endS=[];
for lap=1:C.laps
 ix=find(R.lap==lap);if isempty(ix),continue;end
 on=R.throttle_pct(ix)>0;starts=find(diff([false;on])==1);ends=find(diff([on;false])==-1);
 for j=1:numel(starts)
  a=ix(starts(j));b=ix(ends(j));off=min(ends(j)+1,numel(ix));
  lapNum(end+1,1)=lap;startM(end+1,1)=R.lap_distance_m(a);endM(end+1,1)=R.lap_distance_m(ix(off));
  peakPct(end+1,1)=max(R.throttle_pct(a:b));startS(end+1,1)=R.time_s(a);endS(end+1,1)=R.time_s(ix(off));
 end
end
D=table(lapNum,startM,endM,peakPct,startS,endS,'VariableNames',...
 {'lap','on_m','off_m','peak_throttle_pct','on_time_s','off_time_s'});
writetable(D,fullfile(C.output,[label '_throttle_locations.csv']));
end
