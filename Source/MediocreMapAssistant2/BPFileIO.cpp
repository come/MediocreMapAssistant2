// Fill out your copyright notice in the Description page of Project Settings.

#include "BPFileIO.h"

#include "ModuleManager.h"
#include "FileHelper.h"
#include "Misc/Paths.h"
#include "ImageUtils.h"
#include "IImageWrapper.h"
#include "IImageWrapperModule.h"

bool UBPFileIO::VerifyOrCreateDirectory(const FString & TestDir)
{
	IPlatformFile& PlatformFile = FPlatformFileManager::Get().GetPlatformFile();

	// Directory Exists?
	if (!PlatformFile.DirectoryExists(*TestDir))
	{
		PlatformFile.CreateDirectory(*TestDir);

		if (!PlatformFile.DirectoryExists(*TestDir))
		{
			return false;
		}
	}
	return true;
}

FString UBPFileIO::GetUserDirectory()
{
	return (FString(FPlatformProcess::UserDir()) + "Ragnarock/CustomSongs/");
}

bool UBPFileIO::VerifyDirectory(const FString & TestDir)
{
	IPlatformFile& PlatformFile = FPlatformFileManager::Get().GetPlatformFile();

	// Directory Exists?
	if (!PlatformFile.DirectoryExists(*TestDir))
	{
		return false;
	}
	return true;
}

uint8 getMpegVersion(uint8 num) {

	/*
	 00 - MPEG Version 2.5 (unofficial)
	 01 - reserved
	 10 - MPEG Version 2 (ISO/IEC 13818-3)
	 11 - MPEG Version 1 (ISO/IEC 11172-3)
	 */

	if ((num & 0x03) == 0x03) {
		return 1;
	}

	if ((num & 0x02) == 0x02) {
		return 2;
	}

	return 0;
}

uint8 getMpegLayer(uint8 num) {

	/**
	 00 - reserved
	 01 - Layer III
	 10 - Layer II
	 11 - Layer I
	*/

	if ((num & 0x03) == 0x03) {
		return 1;
	}

	if ((num & 0x02) == 0x02) {
		return 2;
	}

	if ((num & 0x01) == 0x01) {
		return 3;
	}

	return 0;
}

int BITRATES[3][5][16] = { {},
	{
		{},
		{0, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448, 0},
		{0, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384, 0},
		{0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0},
		{0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0}
	},
	{
		{},
		{0, 32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256, 0},
		{0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0},
		{0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0},
		{0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0}
	}
};

int SAMPLE_RATES[3][4] = {
	{0, 0, 0, 0},
	{44100, 48000, 32000, 0},
	{22050, 24000, 16000, 0}
};

int SAMPLES_PER_FRAME[3][4] = {
	{0, 0, 0, 0},
	{0, 384, 1152, 1152},
	{0, 384, 1152, 576}
};

int getMpegFrameLength(bool has_padding, int sample_rate, uint8 layer, int bitrate, int num_samples) {

	uint8 padding = has_padding ? 1 : 0;
	if (sample_rate == 0) {
		return 0;
	}

	if (layer == 1) {
		return ((int) (12.0 * bitrate / sample_rate + padding)) * 4;
	}

	return ((int) (num_samples * (bitrate / 8) / sample_rate)) + padding;
}

uint8 getMpegChannels(uint8 num) {

	/*
	00 - Stereo
	01 - Joint stereo (Stereo)
	10 - Dual channel (2 mono channels)
	11 - Single channel (Mono)
	*/

	if ((num & 0x03) == 0x03) {
		return 1;
	}

	return 2;
}

int CheckFrameInfo(TArray<uint8> FileData, int i, int depth) {
	bool isMP3 = (FileData[i] << 8 | (FileData[i + 1] & 0xF0)) == 0xFFF0;
	if (!isMP3) return -1;

	bool padding = (FileData[i + 2] & 0x02) >> 1 == 0x01;
	uint8 mpegVersion = getMpegVersion(FileData[i + 1] >> 3);
	uint8 mpegLayer = getMpegLayer(FileData[i + 1] >> 1);
	int bitRate = BITRATES[mpegVersion][mpegLayer][(FileData[i + 2] >> 4) & 0x0F] * 1000;
	int sampleRate = SAMPLE_RATES[mpegVersion][(FileData[i + 2] >> 2) & 0x03];
	int sampleCount = SAMPLES_PER_FRAME[mpegVersion][mpegLayer];
	uint8 channels = getMpegChannels(FileData[i + 3] >> 6);

	int frameLength = getMpegFrameLength(padding, sampleRate, mpegLayer, bitRate, sampleCount);
	if (frameLength == 0) return -1;

	UE_LOG(LogTemp, Error, TEXT("Possible mp3 V: %d, L: %d, P: %d, Bitrate: %d, Channels: %d, Sample rate: %d, Sample count: %d, Frame len: %d"), mpegVersion, mpegLayer, padding, bitRate, channels, sampleRate, sampleCount, frameLength);

	if (depth < 2) {
		int otherBitrate = CheckFrameInfo(FileData, i + frameLength, depth + 1);
		if (otherBitrate != bitRate) {
			return -1;
		}
	}
	return bitRate;
}

FString UBPFileIO::CheckAudioFormatMatches(const FString & TestPath)
{
	FString unknownProblem = "Error loading song file";

	TArray<uint8> FileData;
	if (!FFileHelper::LoadFileToArray(FileData, *TestPath))
	{
		UE_LOG(LogTemp, Error, TEXT("Failed to load file"));
		return unknownProblem;
	}

	if (FileData.Num() < 1024) {
		return unknownProblem;
	}

	for (int i = 0; i < 1024; i++) {
		if ((FileData[i] << 8 | (FileData[i+1] & 0xF0)) == 0xFFF0) {
			if (CheckFrameInfo(FileData, i, 0) != -1) {
				if (TestPath.EndsWith(".ogg")) {
					return "That looks like an MP3, you can't just rename files to change their type.\nGo get audacity and convert it properly.";
				}
				return "That looks like an MP3, but it needs to be an ogg.\nPlease use audacity to convert it.";
			}

			return unknownProblem;
		}
	}

	return unknownProblem;
}

FString UBPFileIO::CheckImageFormatMatches(const FString & TestPath)
{
	FString unknownProblem = "Something's weird with your cover image, and i don't know what it is.";
	IImageWrapperModule& ImageWrapperModule = FModuleManager::LoadModuleChecked<IImageWrapperModule>(FName("ImageWrapper"));

	TArray<uint8> FileData;
	if (!FFileHelper::LoadFileToArray(FileData, *TestPath))
	{
		UE_LOG(LogTemp, Error, TEXT("Failed to load file"));
		return unknownProblem;
	}

	EImageFormat fileFormat = ImageWrapperModule.DetectImageFormat(FileData.GetData(), FileData.Num());

	if ((TestPath.EndsWith(".png") && fileFormat == EImageFormat::PNG) ||
		((TestPath.EndsWith(".jpg") || TestPath.EndsWith(".jpeg")) && (fileFormat == EImageFormat::JPEG || fileFormat == EImageFormat::GrayscaleJPEG)))
	{
		return unknownProblem;
	} else if (!TestPath.EndsWith(".png") && !TestPath.EndsWith(".jpg") && !TestPath.EndsWith(".jpeg")) {
		return "Your cover image needs to be a jpg or png and end with .jpg, .jpeg or .png";
	}

	FString fileFormatStr;
	switch (fileFormat) {
		case EImageFormat::BMP:
			fileFormatStr = "BMP";
			break;
		case EImageFormat::PNG:
			fileFormatStr = "PNG";
			break;
		case EImageFormat::JPEG:
		case EImageFormat::GrayscaleJPEG:
			fileFormatStr = "JPG";
			break;
		case EImageFormat::ICO:
			fileFormatStr = "ICO";
			break;
		case EImageFormat::EXR:
			fileFormatStr = "EXR";
			break;
		case EImageFormat::ICNS:
			fileFormatStr = "ICNS";
			break;
		case EImageFormat::Invalid:
		default:
			fileFormatStr = "Unknown";
	}

	return "Your cover image appears to be a " + fileFormatStr + " file, but the extension does not match";
}

TArray<FString> UBPFileIO::FindAllDirectories(const FString & TestDir)
{
	TArray<FString> result;
	IFileManager& FileManager = IFileManager::Get();
	FString FinalPath = TestDir + "/*";

	FileManager.FindFiles(result, *FinalPath, false, true);
	return result;
}

TArray<FString> UBPFileIO::FindAllFiles(const FString & TestDir)
{
	TArray<FString> result;
	IFileManager& FileManager = IFileManager::Get();
	FString FinalPath = TestDir + "/*";

	FileManager.FindFiles(result, *FinalPath, true, false);
	return result;
}

bool UBPFileIO::VerifyFile(const FString & TestFile)
{
	if (FPlatformFileManager::Get().GetPlatformFile().FileExists(*TestFile))
	{
		return true;
	}
	return false;
}

bool UBPFileIO::RenameOrMoveFile(const FString & InputFile, const FString & OutputFile)
{
	if (!FPlatformFileManager::Get().GetPlatformFile().FileExists(*InputFile))
	{
		return false;
	}

	if (!FPlatformFileManager::Get().GetPlatformFile().MoveFile(*OutputFile, *InputFile))
	{
		return false;
	}

	return true;
}

bool UBPFileIO::CopyFile(const FString & File, const FString& OutputDirectory, const FString& newName)
{
	IPlatformFile& PlatformFile = FPlatformFileManager::Get().GetPlatformFile();

	if (PlatformFile.FileExists(*File))
	{
		if (PlatformFile.DirectoryExists(*OutputDirectory))
		{
			PlatformFile.CopyFile(*FString(OutputDirectory + "/" + newName), *File);
			return true;
		}
	}
	return false;
}

bool UBPFileIO::DeleteFile(const FString & File)
{
	if (!FPlatformFileManager::Get().GetPlatformFile().DeleteFile(*File))
	{
		return false;
	}

	return true;
}

bool UBPFileIO::DeleteDirectory(const FString & Directory)
{
	if (!FPlatformFileManager::Get().GetPlatformFile().DeleteDirectoryRecursively(*Directory))
	{
		return false;
	}

	return true;
}

int UBPFileIO::getFileSize(const FString & File)
{
	return FPlatformFileManager::Get().GetPlatformFile().FileSize(*File);
}

int UBPFileIO::getTimestamp(const FString & File)
{
	return FPlatformFileManager::Get().GetPlatformFile().GetTimeStamp(*File).ToUnixTimestamp();
}