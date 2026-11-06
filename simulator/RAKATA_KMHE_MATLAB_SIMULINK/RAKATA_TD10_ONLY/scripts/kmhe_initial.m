function x=kmhe_initial(M)
% [t,total_s,v,u,p,Wh,lap,s,stop_state,hold_elapsed,stop_count,done,invalid,u_cmd,latch,relaunch_t,max_kmh]
x=zeros(17,1);x(5)=M.idle_W;x(7)=1;
end
