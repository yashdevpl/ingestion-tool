import { Dispatch, SetStateAction } from "react";
import { Dialog, DialogContent, DialogHeader } from "../ui/dialog";
import { DialogTitle } from "@radix-ui/react-dialog";
import { Button } from "../ui/button";
import { X } from "lucide-react";
import { LabeledTextInput } from "../labeled-input";
import { Label } from "@radix-ui/react-label";
import LabeledDatePicker from "../labeled-date-picker";
import { IMetadata } from "../../types/common";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../labeled-select";

const MetaDataForm = ({
  closeDialog,
  dialogOpen,
  setDialogOpen,
  handleMetadataChange,
  showClose,
  fileType,
  errors = {},
  metadata = {},
}: {
  errors?: Record<string, string>;
  handleMetadataChange: (field: string, value: any) => void;
  showClose: boolean;
  dialogOpen: boolean;
  metadata?: IMetadata;
  closeDialog: () => void;
  fileType: string;
  setDialogOpen: Dispatch<SetStateAction<boolean>>;
}) => {
  console.log({ errors });
  return (
    <>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          showCloseButton={false}
          className="max-h-[90vh] min-w-7xl overflow-auto p-0"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <Button
                className="absolute top-2 right-2 size-6"
                onClick={closeDialog}
                variant="ghost"
                size="icon"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>{" "}
          <div className="bg-gray-100">
            <div className="mx-auto max-w-4xl">
              <div className="flex w-full max-w-full flex-col gap-4 overflow-hidden rounded-md bg-slate-50 px-3 py-4">
                <div className="flex flex-col gap-3">
                  <Label className="text-sm font-medium text-slate-900">
                    Tracking Information
                  </Label>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-2">
                    <LabeledTextInput
                      label="Target Number *"
                      placeholder="Enter Target Number..."
                      value={metadata.targetNumber || ""}
                      onChange={(e) =>
                        handleMetadataChange("targetNumber", e.target.value)
                      }
                      error={errors.targetNumber}
                      className="text-xs"
                    />
                    <LabeledTextInput
                      label="Target Code *"
                      placeholder="Enter Target code..."
                      value={metadata.trackingCode || ""}
                      onChange={(e) =>
                        handleMetadataChange("trackingCode", e.target.value)
                      }
                      error={errors.trackingCode}
                      className="text-xs"
                    />
                  </div>
                </div>

                {/* Call Information */}
                <div className="flex flex-col gap-3">
                  <Label className="text-sm font-medium text-slate-900">
                    Call Information
                  </Label>
                  <div className="grid w-full max-w-full grid-cols-1 gap-3 sm:grid-cols-4 lg:grid-cols-3">
                    <LabeledTextInput
                      label={fileType == "audio" ? "Caller *" : "Sender *"}
                      placeholder={
                        fileType == "audio"
                          ? "Enter Caller..."
                          : "Enter Sender..."
                      }
                      value={metadata.caller || ""}
                      onChange={(e) =>
                        handleMetadataChange("caller", e.target.value)
                      }
                      error={errors.caller}
                      className="text-xs"
                    />
                    <LabeledTextInput
                      label={fileType == "audio" ? "Caller *" : "Reciever *"}
                      placeholder={
                        fileType == "audio"
                          ? "Enter Caller..."
                          : "Enter Receiver..."
                      }
                      value={metadata.callee || ""}
                      onChange={(e) =>
                        handleMetadataChange("callee", e.target.value)
                      }
                      error={errors.callee}
                      className="text-xs"
                    />
                    <div>
                      <Select
                        value={metadata.direction || ""}
                        onValueChange={(value: any) =>
                          handleMetadataChange("direction", value)
                        }
                      >
                        <SelectTrigger label="Direction *" className="text-xs">
                          <SelectValue placeholder="Select direction" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="6aacaec3-6b25-492e-8558-097078417aea">
                            Incoming
                          </SelectItem>
                          <SelectItem value="5b5fe700-2791-4892-ad53-0bee86e95aa7">
                            Outgoing
                          </SelectItem>
                          {/* <SelectItem value="a879922b-2632-4fbd-9920-120b44c500ca">MISSED</SelectItem> */}
                        </SelectContent>
                      </Select>
                      {errors.direction && (
                        <p className="col-span-4 text-xs text-red-500">
                          {errors.direction}
                        </p>
                      )}
                    </div>
                    {fileType === "text" && (
                      <div className="flex flex-col">
                        <LabeledDatePicker
                          label="SMS Date-Time *"
                          value={metadata.startTime}
                          onChange={(date) =>
                            handleMetadataChange("startTime", date)
                          }
                          className="text-xs"
                        />
                        {errors.startTime && (
                          <p className="text-xs text-red-500">
                            {errors.startTime}
                          </p>
                        )}
                      </div>
                    )}
                    {fileType == "audio" && (
                      <>
                        <div className="flex flex-col">
                          <LabeledDatePicker
                            label="Call Start *"
                            value={metadata.startTime}
                            onChange={(date) =>
                              handleMetadataChange("startTime", date)
                            }
                            className="text-xs"
                          />
                          {errors.startTime && (
                            <p className="text-xs text-red-500">
                              {errors.startTime}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col">
                          <LabeledDatePicker
                            label="Call End *"
                            value={metadata.endTime}
                            onChange={(date) =>
                              handleMetadataChange("endTime", date)
                            }
                            minDate={metadata.startTime}
                            className="text-xs"
                          />
                          {errors.endTime && (
                            <p className="text-xs text-red-500">
                              {errors.endTime}
                            </p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Device Information */}
                <div className="flex flex-col gap-3">
                  <Label className="text-sm font-medium text-slate-900">
                    Device Information
                  </Label>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <LabeledTextInput
                      label="IMEI"
                      placeholder="Enter IMEI..."
                      value={metadata.imei || ""}
                      onChange={(e) =>
                        handleMetadataChange("imei", e.target.value)
                      }
                      className="text-xs"
                    />
                    {errors.imei && (
                      <p className="col-span-2 text-xs text-red-500">
                        {errors.imei}
                      </p>
                    )}
                    <LabeledTextInput
                      label="IMSI"
                      placeholder="Enter IMSI..."
                      value={metadata.imsi || ""}
                      onChange={(e: any) =>
                        handleMetadataChange("imsi", e.target.value)
                      }
                      className="text-xs"
                    />
                    {errors.imsi && (
                      <p className="col-span-2 text-xs text-red-500">
                        {errors.imsi}
                      </p>
                    )}
                  </div>
                </div>

                {/* Location Details */}
                <div className="flex flex-col gap-3">
                  <Label className="text-sm font-medium text-slate-900">
                    Location Details
                  </Label>
                  <div className="grid w-full max-w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-2">
                    <LabeledTextInput
                      label="Start Cell ID"
                      placeholder="Enter Start Cell ID..."
                      value={metadata.startCellId || ""}
                      onChange={(e) =>
                        handleMetadataChange("startCellId", e.target.value)
                      }
                      className="text-xs"
                    />
                    {errors.startCellId && (
                      <p className="col-span-2 text-xs text-red-500">
                        {errors.startCellId}
                      </p>
                    )}
                    <LabeledTextInput
                      label="End Cell ID"
                      placeholder="Enter End Cell ID..."
                      value={metadata.endCellId || ""}
                      onChange={(e) =>
                        handleMetadataChange("endCellId", e.target.value)
                      }
                      className="text-xs"
                    />
                    {errors.endCellId && (
                      <p className="col-span-2 text-xs text-red-500">
                        {errors.endCellId}
                      </p>
                    )}
                    <LabeledTextInput
                      label="Start Cell Address"
                      placeholder="Enter Start Cell Address..."
                      value={metadata.startCellAddress || ""}
                      onChange={(e) =>
                        handleMetadataChange("startCellAddress", e.target.value)
                      }
                      className="text-xs"
                    />
                    {errors.startCellAddress && (
                      <p className="col-span-2 text-xs text-red-500">
                        {errors.startCellAddress}
                      </p>
                    )}
                    <LabeledTextInput
                      label="End Cell Address"
                      placeholder="Enter End Cell Address..."
                      value={metadata.endCellAddress || ""}
                      onChange={(e) =>
                        handleMetadataChange("endCellAddress", e.target.value)
                      }
                      className="text-xs"
                    />
                    {errors.endCellAddress && (
                      <p className="col-span-2 text-xs text-red-500">
                        {errors.endCellAddress}
                      </p>
                    )}
                    <div className="grid grid-cols-2 gap-2 sm:col-span-1 lg:col-span-1">
                      <LabeledTextInput
                        label="Lat."
                        placeholder="Enter Start Latitude..."
                        value={metadata.startCellLatitude || ""}
                        onChange={(e: any) =>
                          handleMetadataChange(
                            "startCellLatitude",
                            e.target.value
                          )
                        }
                        className="pl-13 text-xs"
                      />
                      {errors.startCellLatitude && (
                        <p className="col-span-2 text-xs text-red-500">
                          {errors.startCellLatitude}
                        </p>
                      )}
                      <LabeledTextInput
                        label="Long."
                        placeholder="Enter Start Longitude..."
                        value={metadata.startCellLongitude || ""}
                        onChange={(e: any) =>
                          handleMetadataChange(
                            "startCellLongitude",
                            e.target.value
                          )
                        }
                        className="pl-13 text-xs"
                      />
                      {errors.startCellLongitude && (
                        <p className="col-span-2 text-xs text-red-500">
                          {errors.startCellLongitude}
                        </p>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:col-span-1 lg:col-span-1">
                      <LabeledTextInput
                        label="Lat."
                        placeholder="Enter End Latitude..."
                        value={metadata.endCellLatitude || ""}
                        onChange={(e: any) =>
                          handleMetadataChange(
                            "endCellLatitude",
                            e.target.value
                          )
                        }
                        className="pl-13 text-xs"
                      />
                      {errors.endCellLatitude && (
                        <p className="col-span-2 text-xs text-red-500">
                          {errors.endCellLatitude}
                        </p>
                      )}
                      <LabeledTextInput
                        label="Long."
                        placeholder="Enter End Longitude..."
                        value={metadata.endCellLongitude || ""}
                        onChange={(e: any) =>
                          handleMetadataChange(
                            "endCellLongitude",
                            e.target.value
                          )
                        }
                        className="pl-13 text-xs"
                      />
                      {errors.endCellLongitude && (
                        <p className="col-span-2 text-xs text-red-500">
                          {errors.endCellLongitude}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MetaDataForm;
