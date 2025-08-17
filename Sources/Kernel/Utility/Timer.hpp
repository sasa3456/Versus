// Copyright (c) 2025 Alexander Starov
// MIT License

#ifndef TIMER_HPP
#define TIMER_HPP

#include <chrono>

namespace VE_Kernel
{
    class Timer
    {
    public:
        Timer();
        double GetMilisecondsElapsed();
        void Restart();
        bool Stop();
        bool Start();

    private:
        bool is_running_ = false;
#ifdef _WIN32
        std::chrono::time_point<std::chrono::steady_clock> start_;
        std::chrono::time_point<std::chrono::steady_clock> stop_;
#else
        std::chrono::time_point<std::chrono::system_clock> start_;
        std::chrono::time_point<std::chrono::system_clock> stop_;
#endif
    };
} // namespace VE_Kernel

#endif