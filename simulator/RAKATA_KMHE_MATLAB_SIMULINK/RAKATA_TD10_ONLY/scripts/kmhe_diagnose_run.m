function kmhe_diagnose_run(R,C,T,P,name)
% Explain incomplete runs without modifying controls, measured fitting or physics.
last=R.lap_distance_m(end);missing=max(0,C.length_m*C.laps-R.distance_m(end));
msg=sprintf('Distance %.2f / %.2f m; time %.2f s; energy %.4f Wh; stops %d / %d.\n',...
 R.distance_m(end),C.length_m*C.laps,R.time_s(end),R.energy_Wh(end),R.stop_count(end),C.laps);
if missing>.01
 msg=[msg sprintf('INCOMPLETE: energy is not a completed-attempt efficiency result. Missing %.2f m.\n',missing)];
 q=R.time_s>=R.time_s(end)-10;
 if sum(q)>1&&R.time_s(end)-R.time_s(find(q,1))>=9&&...
    max(R.speed_kmh(q))<.2&&max(R.throttle_pct(q))<.1
  msg=[msg sprintf('STALL: near lap %d station %.2f m; zero throttle, speed below 0.2 km/h for last 10 s.\n',R.lap(end),last)];
  next=find(P(:,1)>last,1);
  if ~isempty(next),msg=[msg sprintf('Next zone starts at %.2f m and cannot be reached at rest without propulsion.\n',P(next,1))];end
  msg=[msg sprintf('Estimated UNEJ grade at stall: %.3f%%. Check strategy reachability and track/model uncertainty.\n',100*interp1(T.s,T.grade,last))];
 end
end
fprintf('%s',msg);
fid=fopen(fullfile(C.output,[name '_diagnosis.txt']),'w');
assert(fid>=0,'Cannot write run diagnosis');cleanup=onCleanup(@()fclose(fid)); %#ok<NASGU>
fprintf(fid,'%s',msg);
end
