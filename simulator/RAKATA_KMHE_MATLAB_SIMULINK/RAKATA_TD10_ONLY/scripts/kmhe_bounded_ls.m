function b=kmhe_bounded_ls(X,y,lo,hi,ridge)
% Bounded coordinate descent, MATLAB dasar; ridge kecil untuk stabilitas.
A=X'*X+ridge*eye(size(X,2));d=X'*y;b=min(hi(:),max(lo(:),zeros(size(d))));
for iteration=1:20000
 old=b;
 for j=1:numel(b),b(j)=min(hi(j),max(lo(j),b(j)+(d(j)-A(j,:)*b)/max(A(j,j),eps)));end
 if norm(b-old,inf)<1e-9,break;end
end
end
