function P=kmhe_project_zones(P,lo,hi)
% Project candidates onto bounded, ordered zones after 5 m / 5% quantization.
assert(isequal(size(P),[4 4])&&isequal(size(lo),[4 4])&&isequal(size(hi),[4 4]),'Expected 4-by-4 zones');
assert(all(isfinite([P(:);lo(:);hi(:)]))&&all(lo<=hi,'all'),'Invalid candidate bounds');
gap=5;
assert(all(hi(:,2)-lo(:,1)>=gap),'Bounds cannot contain positive-length zones');
assert(all(hi(1:3,2)<=lo(2:4,1)),'Search bounds must keep adjacent zones disjoint');
P=min(hi,max(lo,P));
P(:,1:2)=round(P(:,1:2)/5)*5;P(:,3)=round(P(:,3)/5)*5;
P=min(hi,max(lo,P));
% T6 starts can exceed a randomly selected release. Repair BOTH coordinates
% within their original bounds instead of sending an invalid zone to the plant.
P(:,2)=min(hi(:,2),max(P(:,2),P(:,1)+gap));
P(:,1)=max(lo(:,1),min(P(:,1),P(:,2)-gap));
assert(all(P>=lo&P<=hi,'all')&&all(P(:,2)-P(:,1)>=gap),'Zone projection failed');
end
