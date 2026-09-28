export type DriveStorageStatus = "connected" | "not_configured" | "connection_error";

export type DrivePickerConfiguration = {
  accessToken: string;
  apiKey: string;
  projectNumber: string;
};

export type DriveSetupResult = {
  folderId: string;
};
