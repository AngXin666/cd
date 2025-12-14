# Requirements Document

## Introduction

本文档定义了登录页面视觉优化的需求，包括全屏适配、背景图轮流显示机制、以及登录框和输入框的透明度调整。目标是提供一个美观、一致的登录体验，同时保持良好的可读性。

## Glossary

- **Login_Page**: 用户登录系统的页面组件，位于 `src/pages/login/index.tsx`
- **Background_Image**: 登录页面的全屏背景图片，共3张轮流显示
- **Login_Box**: 包含登录表单的容器卡片
- **Input_Field**: 用户输入账号、密码、验证码的输入框
- **Background_Index**: 存储在 localStorage 中的背景图索引值（0、1、2）
- **Opacity**: CSS 透明度值，范围 0-1，其中 0.5 表示 50% 透明度

## Requirements

### Requirement 1

**User Story:** As a user, I want the login page to display in fullscreen mode, so that I can have an immersive login experience without any visual gaps.

#### Acceptance Criteria

1. WHEN the Login_Page loads THEN the Login_Page SHALL render with `position: fixed` covering the entire viewport from top: 0, left: 0, right: 0, bottom: 0
2. WHEN the Login_Page displays THEN the Background_Image SHALL cover the entire screen using `background-size: cover` and `background-position: center`
3. WHEN the device orientation changes THEN the Login_Page SHALL maintain fullscreen coverage without any gaps or overflow

### Requirement 2

**User Story:** As a user, I want to see a different background image each time I visit the login page, so that the login experience feels fresh and varied.

#### Acceptance Criteria

1. WHEN the Login_Page loads THEN the Login_Page SHALL read the current Background_Index from localStorage
2. WHEN the Background_Index is retrieved THEN the Login_Page SHALL calculate the next index using formula `(currentIndex + 1) % 3` to cycle through values 0→1→2→0
3. WHEN the next Background_Index is calculated THEN the Login_Page SHALL save the new index to localStorage with key `login_bg_index`
4. WHEN the Background_Image is selected THEN the Login_Page SHALL display the image corresponding to the current Background_Index
5. WHEN localStorage does not contain a Background_Index THEN the Login_Page SHALL start with index 0

### Requirement 3

**User Story:** As a user, I want the login box to have a semi-transparent background without blur effects, so that I can see the background image while still reading the form clearly.

#### Acceptance Criteria

1. WHEN the Login_Box renders THEN the Login_Box SHALL have a background color with exactly 50% opacity using `rgba(255, 255, 255, 0.5)`
2. WHEN the Login_Box renders THEN the Login_Box SHALL NOT apply any backdrop-filter or blur effects
3. WHEN the Login_Box renders THEN the Login_Box SHALL maintain rounded corners with `border-radius: 16px` (rounded-2xl)

### Requirement 4

**User Story:** As a user, I want the input fields to have a slightly more transparent background than the login box, so that there is visual hierarchy between the container and the inputs.

#### Acceptance Criteria

1. WHEN an Input_Field renders THEN the Input_Field container SHALL have a background color with exactly 45% opacity using `rgba(255, 255, 255, 0.45)`
2. WHEN an Input_Field renders THEN the Input_Field SHALL maintain rounded corners with `border-radius: 12px` (rounded-xl)
3. WHEN an Input_Field receives focus THEN the Input_Field SHALL maintain the same 45% opacity background

### Requirement 5

**User Story:** As a user, I want the login buttons to maintain their semi-transparent styling, so that the visual design is consistent across all interactive elements.

#### Acceptance Criteria

1. WHEN the active login button renders THEN the button SHALL have a semi-transparent background using `rgba(30, 58, 138, 0.85)` for the primary state
2. WHEN the inactive login button renders THEN the button SHALL have a semi-transparent background using `rgba(255, 255, 255, 0.5)`
3. WHEN the login button is in loading state THEN the button SHALL display a reduced opacity using `rgba(59, 130, 246, 0.6)`
