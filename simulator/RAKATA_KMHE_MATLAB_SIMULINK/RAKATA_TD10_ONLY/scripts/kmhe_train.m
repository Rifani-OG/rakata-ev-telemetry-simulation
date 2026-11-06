function M=kmhe_train(C,runs,D)
tr=runs([runs.isTrain]);X=vertcat(tr.X);y=vertcat(tr.y);
lo=[-.8;0;zeros(6,1);-.6*ones(8,1)];hi=[.2;.03;3*ones(6,1);.6*ones(8,1)];w=ones(size(y));
for k=1:5
 b=kmhe_bounded_ls(X.*sqrt(w),y.*sqrt(w),lo,hi,.01);r=y-X*b;sc=1.4826*median(abs(r-median(r)))+.001;w=min(1,1.5*sc./max(abs(r),1e-9));
end
rawp=sort(vertcat(tr.p));idle=interp1(linspace(0,1,numel(rawp)),rawp,.03);
q=vertcat(tr.q);H=vertcat(tr.H);p=vertcat(tr.ps);dp=vertcat(tr.dp);cap=max(rawp)-idle;
bp=kmhe_bounded_ls(H.*q,p+C.power_tau_s*dp-idle,zeros(6,1),cap*ones(6,1),.0001);
M=struct('acceleration_coefficients',b,'power_coefficients',bp,'nodes',[0 7 14 21 28 36],...
 'idle_W',idle,'voltage_V',median(D.voltage_V,'omitnan'),'power_tau_s',C.power_tau_s,'throttle_tau_s',C.throttle_tau_s,...
 'trained_laps',[tr.lap],'heldout_laps',[runs(~[runs.isTrain]).lap],'mass_kg',C.mass_kg,'ratio',C.ratio,...
 'source','TD10_latest.xlsx only','coefficient_bounds_hit',find(abs(b-lo)<1e-5|abs(b-hi)<1e-5));
save(fullfile(C.output,'vehicle_TD10.mat'),'M','C');
fprintf('Latih: %s | Uji: %s | Sampel: %d\n',mat2str(M.trained_laps),mat2str(M.heldout_laps),numel(y));
end
