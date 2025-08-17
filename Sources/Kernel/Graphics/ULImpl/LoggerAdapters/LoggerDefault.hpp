// Copyright (c) 2025 Alexander Starov
// MIT License

#ifndef LOGGERDEFAULT_HPP
#define LOGGERDEFAULT_HPP

#pragma once
#include <Ultralight/platform/Logger.h>

namespace ul = ultralight;
namespace VE_Kernel
{
    class LoggerDefault : public ul::Logger
    {
    public:
        void LogMessage(ul::LogLevel log_level_a,
                        const ul::String16& message_a) override;
    };
} // namespace VE_Kernel

#endif