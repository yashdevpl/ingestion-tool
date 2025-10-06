import dotenv from "dotenv";
import pLimit from "p-limit";
import workerpool from "workerpool";
dotenv.config();

const FILE_CONCURRENCY = 50;
const limit = pLimit(FILE_CONCURRENCY);

export const readCRIFiles = async (files: any[]) => {
  // All SMS text files
  const AudioCriFiles = files.filter(
    (file) =>
      file?.type === "text" &&
      file.metaData?.data?.callType?.toUpperCase() === "VOICE"
  );
  const SMSCriFiles = files.filter(
    (file) =>
      file?.type === "text" &&
      file.metaData?.data?.callType?.toUpperCase() === "SMS"
  );

  // All audio files
  const audioFilesList = files.filter((file) => file?.type === "audio");

  // Map audio files to matching metadata if exists
  const audioMetadataFiles = await Promise.all(
    audioFilesList.map((file) =>
      limit(async () => {
        const matched = AudioCriFiles.find(
          (item) => item.metaData?.data?.fileName === file.name
        );
        return { ...file, metaData: matched ? matched.metaData : null };
      })
    )
  );

  const validFiles = [...SMSCriFiles, ...audioMetadataFiles];

  return { validFiles, audioMetadataFiles, files };
};

workerpool.worker({
  readCRIFiles,
});
