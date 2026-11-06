function kmhe_sfun(block)
% Level-2 MATLAB S-function. Normal simulation; no code-generation claim.
block.NumDialogPrms=4;block.NumInputPorts=1;block.NumOutputPorts=1;
block.SetPreCompInpPortInfoToDynamic;block.SetPreCompOutPortInfoToDynamic;
block.InputPort(1).Dimensions=2;block.InputPort(1).DirectFeedthrough=false;
block.OutputPort(1).Dimensions=11;C=block.DialogPrm(1).Data;
block.SampleTimes=[C.dt 0];
block.RegBlockMethod('PostPropagationSetup',@setupwork);
block.RegBlockMethod('InitializeConditions',@initialize);
block.RegBlockMethod('Outputs',@outputs);
block.RegBlockMethod('Update',@update);
end
function setupwork(block)
block.NumDworks=1;block.Dwork(1).Name='VehicleState';block.Dwork(1).Dimensions=17;block.Dwork(1).DatatypeID=0;block.Dwork(1).Complexity='Real';block.Dwork(1).UsedAsDiscState=true;
end
function initialize(block)
block.Dwork(1).Data=kmhe_initial(block.DialogPrm(2).Data);
end
function outputs(block)
x=block.Dwork(1).Data;M=block.DialogPrm(2).Data;
% speed, total station, throttle, Wh, A, V, lap, hold elapsed, done, invalid, stop count
block.OutputPort(1).Data=[x(3)*3.6;x(2);x(14);x(6);x(5)/M.voltage_V;M.voltage_V;x(7);x(10);x(12);x(13);x(11)];
end
function update(block)
C=block.DialogPrm(1).Data;M=block.DialogPrm(2).Data;T=block.DialogPrm(3).Data;P=block.DialogPrm(4).Data;
block.Dwork(1).Data=kmhe_step(block.Dwork(1).Data,block.InputPort(1).Data,C.dt,C,M,T,P);
end
