% No training/model/Simulink required. Preserve the caller's RNG state.
savedRng=rng;rng(10);
lo=[0 80 95 30;340 410 60 18;665 820 90 26;1150 1280 95 28];
hi=[0 250 100 35.25;440 600 100 26;665 1100 100 35.25;1260 1500 100 35.25];
P=lo;P(2,1)=440;P(2,2)=410;
P=kmhe_project_zones(P,lo,hi);
assert(P(2,2)>P(2,1),'Regression: reversed T6-T7 zone');
for k=1:10000
 P=kmhe_project_zones(lo+(rand(4,4)*3-1).*(hi-lo),lo,hi);
 assert(all(P>=lo&P<=hi,'all')&&all(P(:,2)-P(:,1)>=5));
 assert(all(P(1:3,2)<=P(2:4,1))&&P(1,1)==0&&P(3,1)==665);
 assert(all(abs(P(:,1:2)/5-round(P(:,1:2)/5))<1e-10,'all'));
 assert(all(abs(P(:,3)/5-round(P(:,3)/5))<1e-10));
end
rng(savedRng);disp('Search zones PASS: reversed-zone regression + 10000 bounded candidates');
