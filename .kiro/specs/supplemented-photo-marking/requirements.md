# Requirements Document

## Introduction

本功能为车辆审核流程添加补录照片标记功能。当司机提交补录的照片时，系统会自动标记这些照片为"补录"状态，使老板在审核时能够快速定位和识别哪些照片是后续补充提交的，而非首次提交的原始照片。

## Glossary

- **Supplemented_Photo（补录照片）**: 司机在首次提交审核后，根据审核要求补充提交的照片
- **Photo_Marking_System（照片标记系统）**: 用于标记和显示照片补录状态的系统组件
- **Review_Page（审核页面）**: 老板用于审核车辆信息和照片的页面
- **Supplement_Time（补录时间）**: 照片被补录提交的时间戳

## Requirements

### Requirement 1

**User Story:** As a 老板, I want to 在审核页面快速识别补录的照片, so that I can 高效地审核司机补充提交的内容。

#### Acceptance Criteria

1. WHEN a 司机 submits a supplemented photo THEN the Photo_Marking_System SHALL record the supplement timestamp and mark the photo as supplemented
2. WHEN the Review_Page displays a supplemented photo THEN the Photo_Marking_System SHALL show a visible "补录" badge on the photo
3. WHEN the Review_Page loads THEN the Photo_Marking_System SHALL highlight all supplemented photos with a distinct visual indicator
4. WHEN a 老板 views the photo details THEN the Photo_Marking_System SHALL display the Supplement_Time for supplemented photos

### Requirement 2

**User Story:** As a 司机, I want to 知道哪些照片需要补录, so that I can 准确地补充提交所需的照片。

#### Acceptance Criteria

1. WHEN the system requires photo supplementation THEN the Photo_Marking_System SHALL clearly indicate which specific photos need to be supplemented
2. WHEN a 司机 successfully uploads a supplemented photo THEN the Photo_Marking_System SHALL confirm the upload and update the photo status
3. WHEN a 司机 views their submission status THEN the Photo_Marking_System SHALL show which photos have been marked as supplemented

### Requirement 3

**User Story:** As a 系统管理员, I want to 追踪照片补录历史, so that I can 了解审核流程的完整记录。

#### Acceptance Criteria

1. WHEN a photo is supplemented THEN the Photo_Marking_System SHALL store the original photo reference and the new supplemented photo
2. WHEN querying photo history THEN the Photo_Marking_System SHALL return all versions of a photo including supplement timestamps
3. WHEN displaying photo metadata THEN the Photo_Marking_System SHALL include supplement count and latest supplement time
