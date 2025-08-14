set(SRC
    Editor/Source.cpp
    Editor/pch.hpp
    Kernel/Graphics/D3D/Shaders/PixelShader.cpp
    Kernel/Graphics/D3D/Shaders/VertexShader.cpp
    Kernel/Graphics/D3D/ConstantBuffer.cpp
    Kernel/Graphics/D3D/D3DClass.cpp
    Kernel/Graphics/D3D/VertexBuffer.cpp
    Kernel/Graphics/ULImpl/FileSystems/FileSystemDefault.cpp









)

source_group(" " 		   				FILES ${SRC})

add_executable(Editor 
               ${SRC})
               _
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
    Audio
    Aid
    Graphics
    Physics
)

target_include_directories(Editor
    PRIVATE "${CMAKE_SOURCE_DIR}/External/CUtils/Include"
	PRIVATE "${CMAKE_SOURCE_DIR}/External/GLEW/Include"
	PRIVATE "${CMAKE_SOURCE_DIR}/External/Azurite/Include"
    PRIVATE "${CMAKE_SOURCE_DIR}/Sources/Kernel"
)

set_target_properties(Editor PROPERTIES
    RUNTIME_OUTPUT_DIRECTORY "${CMAKE_RUNTIME_OUTPUT_DIRECTORY}/Editor"
)
