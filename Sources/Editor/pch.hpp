#pragma once
#include <Windows.h>
#include <d3d11.h>
#include <DirectXMath.h>
#include <d3dcompiler.h>
#include <wrl/client.h>
#include <vector>
#include <string>
#include <queue>
#include <memory>
#include <fstream>
#include <map>
#include "../Kernel/Utility/Timer.hpp"
#include "../Kernel/Utility/StringHelper.hpp"
#include "../Kernel/Utility/ErrorHandler.hpp"
#include "../Kernel/Utility/DirectoryHelper.hpp"

#include <Ultralight/Ultralight.h>
#include <Ultralight/MouseEvent.h>
#include <Ultralight/KeyEvent.h>

namespace ul = ultralight;