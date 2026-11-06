function T=kmhe_track(C)
g=jsondecode(fileread(fullfile(C.root,'data','unej_geography.json')));
T.s=g.s(:);T.lat=g.lat(:);T.lng=g.lng(:);T.raw_elevation=g.elevation(:);T.raw_grade=g.grade(:);
T.s=T.s*C.length_m/T.s(end);
% Old schematic has separate start/finish and inconsistent DEM endpoint elevations.
% Closure below is a modelling correction, NOT additional field survey data.
T.net_grade_correction=trapz(T.s,T.raw_grade)/C.length_m;
T.grade=(T.raw_grade-T.net_grade_correction)*C.grade_scale;
T.elevation=T.raw_elevation(1)+cumtrapz(T.s,T.grade);
T.raw_lat=T.lat;T.raw_lng=T.lng;
q=max(0,min(1,(T.s-(C.length_m-50))/50));w=q.^2.*(3-2*q);
T.lat=T.lat+w*(T.lat(1)-T.lat(end));T.lng=T.lng+w*(T.lng(1)-T.lng(end));
T.status='Estimated closure: final 50 m geometry blended; mean grade removed';
x=(T.lng-T.lng(1))*111195*cosd(T.lat(1));y=(T.lat-T.lat(1))*111195;
heading=unwrap(atan2(gradient(y),gradient(x)));k=gradient(heading)./max(.1,hypot(gradient(x),gradient(y)));
T.speed_cap=min(C.max_speed_kmh,sqrt(C.lateral_mps2./max(abs(k),1e-4))*3.6);
T.geometry_speed_cap=T.speed_cap;
% Raises the permissible corner cap, without adding force or enforcing minimum speed.
T.speed_cap=min(C.max_speed_kmh,max(C.corner_cap_floor_kmh,T.speed_cap));
T.markers=g.markers;
assert(all(isfinite([T.s;T.grade;T.speed_cap]))&&all(diff(T.s)>0));
assert(abs(trapz(T.s,T.grade))<1e-8,'Closed-lap elevation must balance');
end
