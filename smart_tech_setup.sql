-- Smart-Tech Database Setup
-- Creates the `smart-tech` database with all required tables

CREATE DATABASE IF NOT EXISTS `smart-tech`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `smart-tech`;

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

-- --------------------------------------------------------
-- Table: users
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `full_name` varchar(100) NOT NULL,
  `role` enum('admin','nurse','triage') NOT NULL DEFAULT 'nurse',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_username_key` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `users` (`id`, `username`, `password`, `full_name`, `role`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'admin', '$2b$10$jVoKrZ8wRN5ZCLTyFnn0FeqP92N/lTceWr9NJ/o7scEFaBnUzXTYq', 'ผู้ดูแลระบบ', 'admin', 1, NOW(3), NOW(3)),
(2, 'doctor1', '$2b$10$7JZ4NLVOF5jzlnqduxffOuoJGpsBs0rX4akfmUkAlDO/Z1A3g/sUe', 'พญ.สมหญิง รักษาดี', 'nurse', 1, NOW(3), NOW(3)),
(3, 'triage', '$2b$10$nT1/lPoZOI8bU4DvKxp6h./nepk7fgPjWWbsN56cOrb7c7GOs3NC2', 'พยาบาลคัดกรอง', 'triage', 1, NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE `username` = VALUES(`username`);

-- --------------------------------------------------------
-- Table: patients
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `patients` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `hn` varchar(20) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `patients_hn_key` (`hn`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `patients` (`id`, `hn`, `first_name`, `last_name`, `created_at`) VALUES
(1, '0000001', 'สมชาย', 'ใจดี', NOW(3)),
(2, '0000002', 'สมหญิง', 'รักสุข', NOW(3)),
(3, '0000003', 'มานะ', 'พากเพียร', NOW(3)),
(4, '0000004', 'วิชัย', 'สุขสันต์', NOW(3)),
(5, '0000005', 'ประภา', 'สว่างจิต', NOW(3)),
(6, '0000006', 'กมล', 'เจริญสุข', NOW(3)),
(7, '0000007', 'สุภาพร', 'ดีใจ', NOW(3)),
(8, '0000008', 'อำนาจ', 'เข้มแข็ง', NOW(3)),
(9, '0000009', 'พิมพ์ใจ', 'สดใส', NOW(3)),
(10, '0000010', 'ธนกฤต', 'รุ่งเรือง', NOW(3)),
(11, '0000011', 'นภา', 'ท้องฟ้า', NOW(3)),
(12, '0000012', 'ศิริ', 'มงคล', NOW(3)),
(13, '0000013', 'ปรีชา', 'ฉลาดดี', NOW(3)),
(14, '0000014', 'ดวงใจ', 'เบิกบาน', NOW(3)),
(15, '0000015', 'วรพล', 'ทรงพลัง', NOW(3)),
(16, '0000016', 'จันทร์', 'เพ็ญ', NOW(3)),
(17, '0000017', 'สมบัติ', 'มั่งมี', NOW(3)),
(18, '0000018', 'รัตนา', 'ประเสริฐ', NOW(3)),
(19, '0000019', 'ชัยวัฒน์', 'ก้าวหน้า', NOW(3)),
(20, '0000020', 'อรุณ', 'ทอแสง', NOW(3))
ON DUPLICATE KEY UPDATE `hn` = VALUES(`hn`);

-- --------------------------------------------------------
-- Table: beds
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `beds` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `bed_number` varchar(20) NOT NULL,
  `zone` varchar(20) NOT NULL DEFAULT 'main',
  `status` enum('available','occupied','maintenance') NOT NULL DEFAULT 'available',
  `patient_id` int(11) DEFAULT NULL,
  `esi_level` int(11) DEFAULT NULL,
  `admitted_at` datetime(3) DEFAULT NULL,
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `beds_bed_number_key` (`bed_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert 38 beds: Main (1-28) + Temporary (29-38)
INSERT INTO `beds` (`bed_number`, `zone`, `status`, `patient_id`, `esi_level`, `admitted_at`, `updated_at`) VALUES
('1', 'main', 'available', NULL, NULL, NULL, NOW(3)),
('2', 'main', 'available', NULL, NULL, NULL, NOW(3)),
('3', 'main', 'available', NULL, NULL, NULL, NOW(3)),
('4', 'main', 'available', NULL, NULL, NULL, NOW(3)),
('5', 'main', 'available', NULL, NULL, NULL, NOW(3)),
('6', 'main', 'available', NULL, NULL, NULL, NOW(3)),
('7', 'main', 'available', NULL, NULL, NULL, NOW(3)),
('8', 'main', 'available', NULL, NULL, NULL, NOW(3)),
('9', 'main', 'available', NULL, NULL, NULL, NOW(3)),
('10', 'main', 'available', NULL, NULL, NULL, NOW(3)),
('11', 'main', 'available', NULL, NULL, NULL, NOW(3)),
('12', 'main', 'available', NULL, NULL, NULL, NOW(3)),
('13', 'main', 'available', NULL, NULL, NULL, NOW(3)),
('14', 'main', 'available', NULL, NULL, NULL, NOW(3)),
('15', 'main', 'available', NULL, NULL, NULL, NOW(3)),
('16', 'main', 'available', NULL, NULL, NULL, NOW(3)),
('17', 'main', 'available', NULL, NULL, NULL, NOW(3)),
('18', 'main', 'available', NULL, NULL, NULL, NOW(3)),
('19', 'main', 'available', NULL, NULL, NULL, NOW(3)),
('20', 'main', 'available', NULL, NULL, NULL, NOW(3)),
('21', 'main', 'available', NULL, NULL, NULL, NOW(3)),
('22', 'main', 'available', NULL, NULL, NULL, NOW(3)),
('23', 'main', 'available', NULL, NULL, NULL, NOW(3)),
('24', 'main', 'available', NULL, NULL, NULL, NOW(3)),
('25', 'main', 'available', NULL, NULL, NULL, NOW(3)),
('26', 'main', 'available', NULL, NULL, NULL, NOW(3)),
('27', 'main', 'available', NULL, NULL, NULL, NOW(3)),
('28', 'main', 'available', NULL, NULL, NULL, NOW(3)),
('29', 'temporary', 'available', NULL, NULL, NULL, NOW(3)),
('30', 'temporary', 'available', NULL, NULL, NULL, NOW(3)),
('31', 'temporary', 'available', NULL, NULL, NULL, NOW(3)),
('32', 'temporary', 'available', NULL, NULL, NULL, NOW(3)),
('33', 'temporary', 'available', NULL, NULL, NULL, NOW(3)),
('34', 'temporary', 'available', NULL, NULL, NULL, NOW(3)),
('35', 'temporary', 'available', NULL, NULL, NULL, NOW(3)),
('36', 'temporary', 'available', NULL, NULL, NULL, NOW(3)),
('37', 'temporary', 'available', NULL, NULL, NULL, NOW(3)),
('38', 'temporary', 'available', NULL, NULL, NULL, NOW(3))
ON DUPLICATE KEY UPDATE `bed_number` = VALUES(`bed_number`);

-- --------------------------------------------------------
-- Table: patient_bed_history
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `patient_bed_history` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `patient_id` int(11) NOT NULL,
  `bed_id` int(11) NOT NULL,
  `action` varchar(20) NOT NULL,
  `esi_level` int(11) DEFAULT NULL,
  `details` text DEFAULT NULL,
  `performed_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `delivery_status` varchar(100) DEFAULT NULL,
  `other_symptoms` text DEFAULT NULL,
  `discharge_time` datetime DEFAULT NULL,
  `admission_time` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `patient_bed_history_patient_id_fkey` (`patient_id`),
  KEY `patient_bed_history_bed_id_fkey` (`bed_id`),
  CONSTRAINT `patient_bed_history_patient_id_fkey` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `patient_bed_history_bed_id_fkey` FOREIGN KEY (`bed_id`) REFERENCES `beds` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: queues
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `queues` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `patient_id` int(11) NOT NULL,
  `status` enum('waiting','called','completed','cancelled') NOT NULL DEFAULT 'waiting',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `called_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `queues_patient_id_fkey` (`patient_id`),
  CONSTRAINT `queues_patient_id_fkey` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: queue_calls
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `queue_calls` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `queue_id` int(11) NOT NULL,
  `called_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  KEY `queue_calls_queue_id_fkey` (`queue_id`),
  CONSTRAINT `queue_calls_queue_id_fkey` FOREIGN KEY (`queue_id`) REFERENCES `queues` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: system_settings
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `system_settings` (
  `setting_key` varchar(100) NOT NULL,
  `setting_value` text DEFAULT NULL,
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `system_settings` (`setting_key`, `setting_value`, `updated_at`) VALUES
('sound_settings', '{"googleTtsEnabled":true,"browserTtsEnabled":false,"voiceName":"","voiceLang":"th-TH","speechTemplate":"ขอเชิญหมายเลข {{HN}} เข้ารับการรักษา","speechPause":0.5,"speechRate":1,"pageInterval":15,"showSoundButton":true}', NOW(3)),
('theme', 'teal', NOW(3))
ON DUPLICATE KEY UPDATE `setting_key` = VALUES(`setting_key`);

-- --------------------------------------------------------
-- Table: activity_logs
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `activity_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `action` varchar(50) NOT NULL,
  `details` text DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  KEY `activity_logs_user_id_fkey` (`user_id`),
  CONSTRAINT `activity_logs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

COMMIT;
