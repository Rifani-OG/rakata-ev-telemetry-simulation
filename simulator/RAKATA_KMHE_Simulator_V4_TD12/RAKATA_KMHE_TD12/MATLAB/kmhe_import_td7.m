% Import format TD7_FULL.xlsx satu kolom CSV dan bentuk lookup awal kendaraan.
C=kmhe_config;if ~exist(C.result_dir,'dir'),mkdir(C.result_dir);end;src=fullfile(fileparts(mfilename('fullpath')),'data','TD7_FULL.xlsx');
if ~isfile(src),error('Salin TD7_FULL.xlsx ke folder data terlebih dahulu.');end
raw=readcell(src,'TextType','string');lines=string(raw(:,1));A=split(lines,',');
V=str2double(A(:,4));U=str2double(A(:,6));I=str2double(A(:,7))/1000;Volt=str2double(A(:,8));P=str2double(A(:,9));ms=str2double(A(:,12));
dt=[NaN;diff(ms)/1000];a=[NaN;diff(V/3.6)./dt];valid=dt>0.04&dt<0.5&isfinite(a)&V>=3&V<=36;
nodes=(5:2:35)';accel=nan(size(nodes));powerFull=nan(size(nodes));coast=nan(size(nodes));
for k=1:numel(nodes),q=abs(V-nodes(k))<=1&valid;accel(k)=median(a(q&U>=95),'omitnan');powerFull(k)=median(P(q&U>=95),'omitnan');coast(k)=median(a(q&U<=1),'omitnan');end
accel=fillmissing(accel,'linear','EndValues','nearest');powerFull=fillmissing(powerFull,'linear','EndValues','nearest');coast=fillmissing(coast,'linear','EndValues','nearest');
calibration=struct('speed_kmh',nodes,'accel_full_mps2',accel,'power_full_W',powerFull,'coast_mps2',coast,'voltage_V',median(Volt(isfinite(Volt)),'omitnan'),'source','TD7_FULL.xlsx');
save(fullfile(fileparts(mfilename('fullpath')),'data','vehicle_calibration.mat'),'calibration');
figure('Color','w');tiledlayout(3,1);nexttile;plot(nodes,accel,'o-');ylabel('a full (m/s²)');grid on;nexttile;plot(nodes,coast,'o-');ylabel('a coast');grid on;nexttile;plot(nodes,powerFull,'o-');ylabel('Power full (W)');xlabel('Speed (km/h)');grid on;
exportgraphics(gcf,fullfile(C.result_dir,'td7_vehicle_calibration.png'),'Resolution',180);disp(calibration)
