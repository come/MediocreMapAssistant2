// Fill out your copyright notice in the Description page of Project Settings.

#pragma once

#include "CoreMinimal.h"
#include "CoreGlobals.h"
#include "Kismet/BlueprintFunctionLibrary.h"
#include "Updater.generated.h"

/**
 * 
 */
UCLASS()
class MEDIOCREMAPASSISTANT2_API UUpdater : public UBlueprintFunctionLibrary
{
	GENERATED_BODY()
	public:
	UFUNCTION(BlueprintCallable, meta = (DisplayName = "UpdateUpdater"), Category = "updaterUpdater")
		static bool updateUpdater();

	UFUNCTION(BlueprintPure, meta = (DisplayName = "Project Version", CompactNodeTitle = "ProjectVersion"), Category = "System Information")
		static FString getProjectVersion();

};
