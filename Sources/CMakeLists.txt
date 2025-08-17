set(SRC
    Editor/Source.cpp
    Kernel/Graphics/D3D/Shaders/PixelShader.cpp
    Kernel/Graphics/D3D/Shaders/VertexShader.cpp
    Kernel/Graphics/D3D/ConstantBuffer.cpp
    Kernel/Graphics/D3D/D3DClass.cpp
    Kernel/Graphics/D3D/VertexBuffer.cpp
    Kernel/Graphics/ULImpl/FileSystems/FileSystemDefault.cpp
    Kernel/Graphics/ULImpl/FontLoaderAdapters/FontLoaderWin.cpp
    Kernel/Graphics/ULImpl/FontLoaderAdapters/TextAnalysisSource.cpp
    Kernel/Graphics/ULImpl/GPUAdapters/GPUDriverD3D11.cpp
    Kernel/Graphics/ULImpl/GPUAdapters/GPUDriverImpl.cpp
    Kernel/Graphics/ULImpl/LoadListeners/HtmlViewLoadListener.cpp
    Kernel/Graphics/ULImpl/LoggerAdapters/LoggerDefault.cpp
    Kernel/Graphics/ULImpl/ViewListeners/HtmlViewViewListener.cpp
    Kernel/Graphics/ULImpl/HtmlView.cpp
    Kernel/Graphics/ULImpl/HtmlViewManager.cpp
    Kernel/Graphics/Renderer.cpp
    Kernel/Utility/DirectoryHelper.cpp
    Kernel/Utility/ErrorHandler.cpp
    Kernel/Utility/MimeTypeHelper.cpp
    Kernel/Utility/StringHelper.cpp
    Kernel/Utility/Timer.cpp
    Kernel/Window/Input/Keyboard.cpp
    Kernel/Window/Input/KeyboardEvent.cpp
    Kernel/Window/Input/Mouse.cpp
    Kernel/Window/Input/MouseEvent.cpp
    Kernel/Window/Window.cpp
    Kernel/Kernel.cpp
	resource.rc  # Добавляем файл ресурсов
    ../../Resources/Icon/icon.ico  # Добавляем иконку
)

source_group(" " 		   				FILES ${SRC})

add_executable(Editor WIN32 ${SRC})
               
# ------------------------------------------------------
# ------------------COMPILE-OPTIONS---------------------
# ------------------------------------------------------

target_compile_options(Editor PRIVATE
    $<$<CXX_COMPILER_ID:MSVC>:/wd4099>
    $<$<CXX_COMPILER_ID:MSVC>:/wd4311>
	$<$<CXX_COMPILER_ID:MSVC>:/wd4302>
	$<$<CXX_COMPILER_ID:MSVC>:/wd4245>
	$<$<CXX_COMPILER_ID:MSVC>:/wd4189>
    $<$<OR:$<CXX_COMPILER_ID:GNU>,$<CXX_COMPILER_ID:Clang>>:-Wno-unused-variable>)


target_link_libraries(Editor PRIVATE
    "${CMAKE_SOURCE_DIR}/External/Ultralight/lib/Ultralight.lib"
    "${CMAKE_SOURCE_DIR}/External/Ultralight/lib/UltralightCore.lib"
    "${CMAKE_SOURCE_DIR}/External/Ultralight/lib/Webcore.lib"
    d3d11.lib
    D3DCompiler.lib
    Dwrite.lib
    dwmapi.lib
)

target_include_directories(Editor
    PRIVATE "${CMAKE_SOURCE_DIR}/External/Ultralight/inc"
)

add_custom_command(TARGET Editor POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E copy_directory
        "${CMAKE_SOURCE_DIR}/Resources/UI"
        "$<TARGET_FILE_DIR:Editor>"
    VERBATIM
)

add_custom_command(TARGET Editor POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E copy_directory
        "${CMAKE_SOURCE_DIR}/External/CSO_Shaders"
        "$<TARGET_FILE_DIR:Editor>"
    VERBATIM
)

add_custom_command(TARGET Editor POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E copy_directory
        "${CMAKE_SOURCE_DIR}/External/Ultralight/dll"
        "$<TARGET_FILE_DIR:Editor>"
    VERBATIM
)