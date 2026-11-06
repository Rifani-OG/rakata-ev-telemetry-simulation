function [runs,audit,D]=kmhe_prepare(C)
assert(isfile(C.source),'Sumber wajib: data/TD10_latest.xlsx (file td10full(2).xlsx terbaru).');
R=readcell(C.source);N=size(R,1);A=nan(N,11);stamp=strings(N,1);
for i=1:N
 if size(R,2)==1,p=split(string(R{i,1}),',');else,p=string(R(i,:))';end
 if numel(p)~=12,continue;end
 stamp(i)=p(1);A(i,:)=str2double(p(2:12))';
end
% Header, bila ada, diabaikan. Baris data rusak tetap ditandai untuk audit.
if all(isnan(A(1,:))),A(1,:)=[];stamp(1)=[];end
names={'lat','lng','speed_kmh','sat','throttle_pct','current_mA','voltage_V','power_W','energy_Wh','distance_km','millis'};
D=array2table(A,'VariableNames',names);D.timestamp=stamp;D.source_row=(1:height(D))';
writetable(D,fullfile(C.output,'source_audit_table.csv'));
G=jsondecode(fileread(fullfile(C.root,'data','sport_jabar_geography.json')));
cut=[1;find(diff(D.distance_km)<-.1)+1;height(D)+1];runs=struct([]);audit=table;
for lap=1:numel(cut)-1
 z=D(cut(lap):cut(lap+1)-1,:);first=find(z.throttle_pct>1,1);
 if isempty(first),continue;end
 z=z(max(1,first-10):end,:);t0=(z.millis-z.millis(1))/1000;
 valid=all(isfinite(z{:,1:11}),'all')&&all(diff(t0)>0&diff(t0)<=C.max_gap_s)&&(z.distance_km(end)-z.distance_km(1))>=1.2;
 splitName="excluded";if valid,if ismember(lap,C.test_laps),splitName="test";else,splitName="train";end,end
 row=table(lap,z.source_row(1),z.source_row(end),valid,splitName,t0(end),1000*(z.distance_km(end)-z.distance_km(1)),z.speed_kmh(end),'VariableNames',{'lap','first_row','last_row','valid','split','duration_s','distance_m','end_speed_kmh'});audit=[audit;row]; %#ok<AGROW>
 if ~valid,continue;end
 t=(0:.1:t0(end)-1e-7)';v=interp1(t0,z.speed_kmh,t);u=interp1(t0,z.throttle_pct/100,t,'previous');p=interp1(t0,z.power_W,t);s=interp1(t0,z.distance_km*1000,t);s=(s-s(1))*1440/(s(end)-s(1));
 vs=conv([repmat(v(1),5,1);v;repmat(v(end),5,1)],ones(11,1)/11,'valid');ps=conv([repmat(p(1),5,1);p;repmat(p(end),5,1)],ones(11,1)/11,'valid');
 a=gradient(vs/3.6,.1);dp=gradient(ps,.1);ue=zeros(size(u));ue(1)=u(1);
 for k=2:numel(t),ue(k)=ue(k-1)+(u(k-1)-ue(k-1))*(1-exp(-.1/C.throttle_tau_s));end
 grade=interp1(G.s,G.grade,s);[X,q,H]=kmhe_features(vs,ue,s,C);
 keep=vs>=1&vs<=35.3&abs(a)<1.8&t>1&t<t(end)-1;
 r=struct('lap',lap,'isTrain',splitName=="train",'t',t,'v',v,'u',u,'p',p,'s',s,'grade',grade,'X',X(keep,:),'y',a(keep)+9.81*grade(keep),'q',q(keep),'H',H(keep,:),'ps',ps(keep),'dp',dp(keep));
 runs=[runs;r]; %#ok<AGROW>
end
writetable(audit,fullfile(C.output,'lap_audit_matlab.csv'));
assert(sum([runs.isTrain])>=3&&sum(~[runs.isTrain])>=2,'Butuh set latih dan uji lap terpisah.');
save(fullfile(C.output,'prepared_TD10.mat'),'runs','audit','C','-v7');
end
