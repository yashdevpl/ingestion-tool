

import type { Dispatch, ReactNode, SetStateAction } from "react";
import { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";

type TimeState = { start: string; end: string };

export interface ICommonTypes {
  keyword: string;
  value: string;
  uuid: string;
}
export interface TargetCallFilters {
  associated: string[];
  callerReceiver: string[];
  duration: string;
  category: string[];
  criticality: string[];
  direction: string;
  keyWordMatchingIds: {
    keyWord: string;
    calls: string[];
    bgColor: string;
    tabName: string;
  };
  callReadStatus: string;
  associatedNumbers: string[];
  summarySearch: string;
}
export interface ITargetSMSFilters {
  smsType: string[];
  messageSearch: string;
  smsCriticality: string[];
  associatedNumber: string[];
  senderReciverNumber: string[];
  smsReadStatus: string;
  smsUids: string[];
  searchedKeyword: {
    label: string;
    bgColor: string;
    tabName: string;
  };
}

export interface IGeoFilters {
  layout: "timeline" | "geo-fence";
  startTime: Date | undefined;
  endTime: Date | undefined;
  timeOfDay: "all" | "day" | "night";
  sourceTypes: ("Call" | "SMS")[];
  showSidebar: boolean;
}

type FiltersContextType = {
  timeframe: TimeState;
  setTimeframe: Dispatch<SetStateAction<TimeState>>;
  targetPriority: string;
  setTargetPriority: Dispatch<SetStateAction<string>>;
  filesCriticality: string;
  setFilesCriticality: Dispatch<SetStateAction<string>>;
  dataOptions: unknown[];
  setDataOptions: Dispatch<SetStateAction<unknown[]>>;
  setTargetUuids: Dispatch<SetStateAction<string[]>>;
  setTargetCallFilters: Dispatch<SetStateAction<TargetCallFilters>>;
  setTargetSMSFilters: Dispatch<SetStateAction<ITargetSMSFilters>>;
  targetSMSFilters: ITargetSMSFilters;
  targetCallFilters: TargetCallFilters;
  targetUuids: string[];
  getFilteredTypes: (key: string) => ICommonTypes[];
  activeMainTab: TabKey;
  setActiveMainTab: Dispatch<SetStateAction<TabKey>>;
  activeSubTab: SubTabKey;
  setActiveSubTab: Dispatch<SetStateAction<SubTabKey>>;
  setLocatorFilter: Dispatch<SetStateAction<{ tab: string }>>;
  locatorFilter: { tab: string };
  openUploadFile: boolean;
  setOpenUploadFile: Dispatch<SetStateAction<boolean>>;
  geoFilters: IGeoFilters;
  setGeoFilters: Dispatch<SetStateAction<IGeoFilters>>;
  setHideColumnListCalls: Dispatch<SetStateAction<string[]>>;
  hideColumnListCalls: string[];
  resetSMSFilter: () => void;
  resetCallsFilter: () => void;
  setSearchInputValue: Dispatch<SetStateAction<string>>;
  serachInputValue: string;
  openAudioDetails: boolean;
  setOpenAdudioDetails: Dispatch<SetStateAction<boolean>>;
  setActiveMarkerId: Dispatch<SetStateAction<string | null>>;
  activeMarkerId: string | null;
  setOpenSMSDetails: Dispatch<SetStateAction<boolean>>;
  openSMSDetails: boolean;
};

const FiltersContext = createContext<FiltersContextType | undefined>(undefined);
type TabKey = "calls" | "sms" | "geo";
type SubTabKey = "records" | "keywords" | "locators" | "comments";

export const FiltersProvider = ({ children }: { children: ReactNode }) => {
  const [timeframe, setTimeframe] = useState<TimeState>({ start: "", end: "" });
  const [targetPriority, setTargetPriority] = useState<string>("all");
  const [filesCriticality, setFilesCriticality] = useState<string>("all");
  const [dataOptions, setDataOptions] = useState<unknown[]>([]);
  const [targetUuids, setTargetUuids] = useState<string[]>([]);
  const [hideColumnListCalls, setHideColumnListCalls] = useState<string[]>([
    "summary",
  ]);
  const [openAudioDetails, setOpenAdudioDetails] = useState<boolean>(false);
  const [openSMSDetails, setOpenSMSDetails] = useState<boolean>(false);
  const [activeMarkerId, setActiveMarkerId] = useState<string | null>(null);
  const [activeMainTab, setActiveMainTab] = useState<TabKey>("calls");
  const [activeSubTab, setActiveSubTab] = useState<SubTabKey>("records");

  const [locatorFilter, setLocatorFilter] = useState({ tab: "sms" });
  const [openUploadFile, setOpenUploadFile] = useState(false);
  const [targetCallFilters, setTargetCallFilters] = useState<TargetCallFilters>(
    {
      associated: [],
      category: [],
      criticality: [],
      duration: "all",
      callerReceiver: [],
      direction: "all",
      keyWordMatchingIds: { calls: [], keyWord: "", bgColor: "", tabName: "" },
      callReadStatus: "all",
      associatedNumbers: [],
      summarySearch: "",
    }
  );
  const [targetSMSFilters, setTargetSMSFilters] = useState<ITargetSMSFilters>({
    smsCriticality: [],
    smsType: [],
    messageSearch: "",
    smsUids: ["all"],
    searchedKeyword: { label: "", bgColor: "", tabName: "" },
    associatedNumber: [],
    senderReciverNumber: [],
    smsReadStatus: "all",
  });

  const resetSMSFilter = () => {
    setTargetSMSFilters({
      smsCriticality: [],
      smsType: [],
      messageSearch: "",
      smsUids: ["all"],
      searchedKeyword: { label: "", bgColor: "", tabName: "" },
      associatedNumber: [],
      senderReciverNumber: [],
      smsReadStatus: "all",
    });
  };
  const resetCallsFilter = () => {
    setTargetCallFilters({
      associated: [],
      category: [],
      criticality: [],
      duration: "all",
      callerReceiver: [],
      direction: "all",
      keyWordMatchingIds: { calls: [], keyWord: "", bgColor: "", tabName: "" },
      callReadStatus: "all",
      associatedNumbers: [],
      summarySearch: "",
    });
  };

  const [geoFilters, setGeoFilters] = useState<IGeoFilters>(() => {
    // Ensure dates are valid
    return {
      layout: "timeline",
      startTime: undefined,
      endTime: undefined,
      timeOfDay: "all",
      sourceTypes: ["Call", "SMS"],
      showSidebar: true,
    };
  });

  const [commonTypes, setCommonTypes] = useState<ICommonTypes[]>([]);
  const [serachInputValue, setSearchInputValue] = useState<string>("");
  const getFilteredTypes = (key: string): ICommonTypes[] => {
    return commonTypes.filter((item) => item.keyword === key);
  };

  const getCommonTypes = async () => {
    try {
      const commonTypesResponse = await axios.get(
        "http://localhost:3000/api/types"
      );
      if (commonTypesResponse.data.data.status) {
        setCommonTypes(commonTypesResponse.data.data.data.data);
      }
    } catch (error) {
      console.error("Error get common types > ", error);
    }
  };

  useEffect(() => {
    if (!commonTypes.length) getCommonTypes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <FiltersContext.Provider
      value={{
        openSMSDetails,
        setOpenSMSDetails,
        activeMarkerId,
        setActiveMarkerId,
        openAudioDetails,
        setOpenAdudioDetails,
        resetCallsFilter,
        resetSMSFilter,
        hideColumnListCalls,
        setHideColumnListCalls,
        locatorFilter,
        openUploadFile,
        setOpenUploadFile,
        setLocatorFilter,
        activeMainTab,
        setActiveMainTab,
        activeSubTab,
        setActiveSubTab,
        setTargetSMSFilters,
        targetSMSFilters,
        timeframe,
        setTimeframe,
        targetPriority,
        setTargetPriority,
        setTargetUuids,
        targetUuids,
        setTargetCallFilters,
        targetCallFilters,
        filesCriticality,
        setFilesCriticality,
        dataOptions,
        setDataOptions,
        getFilteredTypes,
        geoFilters,
        setGeoFilters,
        setSearchInputValue,
        serachInputValue,
      }}
    >
      {children}
    </FiltersContext.Provider>
  );
};

export const useFiltersContext = () => {
  const ctx = useContext(FiltersContext);
  if (!ctx)
    throw new Error("useFiltersContext must be used within FiltersProvider");
  return ctx;
};
