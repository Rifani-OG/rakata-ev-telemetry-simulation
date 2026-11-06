function T = kmhe_load_track(C)
T = readtable(C.track_file); T.distance_m = T.distance_m * C.track_length_m / T.distance_m(end);
T.grade = T.grade_pct/100; T.grade = smoothdata(T.grade,'gaussian',7);
assert(abs(T.distance_m(end)-1600)<1e-6,'Track harus 1600 m');
end
