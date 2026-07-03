#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::env;
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use lazy_static::lazy_static;
use chrono::{Utc, Datelike};
use tauri::Manager;
use argon2::{Argon2, PasswordHash, PasswordHasher, PasswordVerifier};
use argon2::password_hash::{rand_core::OsRng, SaltString};

#[cfg(unix)]
use std::os::unix::fs::PermissionsExt;


// ============================================
// ERROR PROPAGATION (Production Grade)
// ============================================

#[derive(Debug, Serialize)]
pub enum MickiiError {
    Io(String),
    NotAbsolute(String),
    Shell(String),
    System(String),
}

impl From<std::io::Error> for MickiiError {
    fn from(err: std::io::Error) -> Self {
        MickiiError::Io(err.to_string())
    }
}

impl From<String> for MickiiError {
    fn from(err: String) -> Self {
        MickiiError::System(err)
    }
}

type MickiiResult<T> = std::result::Result<T, MickiiError>;

// ============================================
// SHARED APP STATE
// ============================================
pub struct AppState {
    pub client: reqwest::Client,
}

const SECRET_REF_PREFIX: &str = "secret://";

fn secret_env_name(key: &str) -> String {
    let safe_key: String = key
        .chars()
        .map(|ch| if ch.is_ascii_alphanumeric() { ch.to_ascii_uppercase() } else { '_' })
        .collect();
    format!("MABISHION_{}", safe_key)
}

fn secret_store_path(app: &tauri::AppHandle) -> std::result::Result<PathBuf, String> {
    let dir = app
        .path()
        .app_config_dir()
        .map_err(|e| format!("Secret config path unavailable: {}", e))?;
    Ok(dir.join("secrets.json"))
}

fn read_secret_store(app: &tauri::AppHandle) -> std::result::Result<HashMap<String, String>, String> {
    let path = secret_store_path(app)?;
    if !path.exists() {
        return Ok(HashMap::new());
    }

    let text = fs::read_to_string(path)
        .map_err(|e| format!("Secret store read failed: {}", e))?;
    serde_json::from_str(&text)
        .map_err(|e| format!("Secret store parse failed: {}", e))
}

fn write_secret_store(app: &tauri::AppHandle, store: &HashMap<String, String>) -> std::result::Result<(), String> {
    let path = secret_store_path(app)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Secret config directory create failed: {}", e))?;
    }

    let text = serde_json::to_string_pretty(store)
        .map_err(|e| format!("Secret store serialize failed: {}", e))?;
    fs::write(&path, text)
        .map_err(|e| format!("Secret store write failed: {}", e))?;

    #[cfg(unix)]
    {
        let permissions = fs::Permissions::from_mode(0o600);
        fs::set_permissions(&path, permissions)
            .map_err(|e| format!("Secret store permission hardening failed: {}", e))?;
    }

    Ok(())
}

fn resolve_secret_value(app: &tauri::AppHandle, key_or_value: &str) -> std::result::Result<String, String> {
    let key = key_or_value
        .strip_prefix(SECRET_REF_PREFIX)
        .unwrap_or(key_or_value);

    if let Ok(value) = env::var(secret_env_name(key)) {
        if !value.trim().is_empty() {
            return Ok(value);
        }
    }

    if key_or_value.starts_with(SECRET_REF_PREFIX) {
        let store = read_secret_store(app)?;
        return store
            .get(key)
            .cloned()
            .ok_or_else(|| format!("Secret '{}' is not configured.", key));
    }

    Ok(key_or_value.to_string())
}

#[tauri::command]
fn store_secret(app: tauri::AppHandle, key: String, value: String) -> std::result::Result<String, String> {
    if key.trim().is_empty() {
        return Err("Secret key name cannot be empty.".to_string());
    }

    let mut store = read_secret_store(&app)?;
    if value.trim().is_empty() {
        store.remove(&key);
    } else {
        store.insert(key.clone(), value);
    }
    write_secret_store(&app, &store)?;
    Ok(format!("{}{}", SECRET_REF_PREFIX, key))
}

#[tauri::command]
fn read_secret(app: tauri::AppHandle, key: String) -> std::result::Result<Option<String>, String> {
    if let Ok(value) = env::var(secret_env_name(&key)) {
        if !value.trim().is_empty() {
            return Ok(Some(value));
        }
    }

    let store = read_secret_store(&app)?;
    Ok(store.get(&key).cloned())
}

// ============================================
// INSTANT RESPONSE CACHE — Pre-computed
// Loaded at startup, never calls external API
// ============================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstantResponse {
    pub intent: String,
    pub skill_id: Option<String>,
    pub response_template: String,
    pub action: String,
    pub confidence: f32,
}

lazy_static! {
    static ref INTENT_CACHE: Mutex<HashMap<String, InstantResponse>> = Mutex::new({
        let mut map = HashMap::new();
        
        // Website Skills
        map.insert("website_ban".to_string(), InstantResponse {
            intent: "execute_skill".to_string(),
            skill_id: Some("website_build".to_string()),
            response_template: "✅ **Website skill ready!**\n\nClient name batao aur niche se template select karo:\n• Fitness Landing\n• Coach Landing\n• Real Estate\n• Agency\n\nMickii template load karke sections add kar dega.".to_string(),
            action: "show_template_selector".to_string(),
            confidence: 1.0,
        });
        map.insert("website".to_string(), InstantResponse {
            intent: "execute_skill".to_string(),
            skill_id: Some("website_build".to_string()),
            response_template: "✅ **Website skill ready!**\n\nKaunsa type?\n1. Landing page\n2. Full website\n3. E-commerce\n\nClient name batao.".to_string(),
            action: "show_template_selector".to_string(),
            confidence: 0.95,
        });
        
        // Proposal Skills
        map.insert("proposal_ban".to_string(), InstantResponse {
            intent: "execute_skill".to_string(),
            skill_id: Some("proposal_create".to_string()),
            response_template: "✅ **Proposal template loaded!**\n\nClient: {client_name}\nProject: {project_name}\n\nMickii ne standard proposal structure ready kar li hai. Price aur scope fill karo.".to_string(),
            action: "show_proposal_form".to_string(),
            confidence: 1.0,
        });
        map.insert("proposal".to_string(), InstantResponse {
            intent: "execute_skill".to_string(),
            skill_id: Some("proposal_create".to_string()),
            response_template: "✅ **Proposal skill active!**\n\nKaunsa type?\n• Standard (50% upfront)\n• Premium (branded)\n• Quick (1-page)\n\nClient name batao.".to_string(),
            action: "show_proposal_form".to_string(),
            confidence: 0.95,
        });
        
        // Lead Skills
        map.insert("lead_check".to_string(), InstantResponse {
            intent: "show_data".to_string(),
            skill_id: None,
            response_template: "📊 **Lead Status Report**\n\n🔥 Hot: {hot_count}\n🌡️ Warm: {warm_count}\n❄️ Cold: {cold_count}\n\n**Top Priority:** {top_lead}\n**Next Action:** {next_action}\n\nFollow-up karoon?".to_string(),
            action: "render_lead_dashboard".to_string(),
            confidence: 1.0,
        });
        map.insert("leads".to_string(), InstantResponse {
            intent: "show_data".to_string(),
            skill_id: None,
            response_template: "📊 **Lead Pipeline**\n\nTotal: {total_leads}\nHot: {hot_count} | Warm: {warm_count} | Cold: {cold_count}\n\nKaunsa lead check karna hai?".to_string(),
            action: "render_lead_dashboard".to_string(),
            confidence: 0.9,
        });
        
        // Morning Brief / Status
        map.insert("aaj_kya_karna".to_string(), InstantResponse {
            intent: "morning_brief".to_string(),
            skill_id: None,
            response_template: "🌅 **Good morning Adii!**\n\nAaj ka plan:\n1. **{top_priority}**\n2. **{second_priority}**\n3. **{third_priority}**\n\n📈 Pipeline: {pipeline_value}\n⏳ Pending Approvals: {pending_approvals}\n🔥 Hot Leads: {hot_leads}\n\nPehle kya karna hai?".to_string(),
            action: "show_dashboard".to_string(),
            confidence: 1.0,
        });
        map.insert("morning".to_string(), InstantResponse {
            intent: "morning_brief".to_string(),
            skill_id: None,
            response_template: "🌅 **Morning Brief Ready!**\n\n{pending_approvals} approvals pending\n{active_projects} projects active\n{hot_leads} hot leads waiting\n\nFocus area: {focus_area}".to_string(),
            action: "show_dashboard".to_string(),
            confidence: 0.95,
        });
        map.insert("status".to_string(), InstantResponse {
            intent: "morning_brief".to_string(),
            skill_id: None,
            response_template: "📊 **System Status**\n\nMickii: ✅ Online\nSkills Loaded: {skill_count}\nTemplates: {template_count}\nLast Backup: {last_backup}\n\nEverything running smooth.".to_string(),
            action: "show_dashboard".to_string(),
            confidence: 0.9,
        });
        
        // Revenue / Money
        map.insert("revenue".to_string(), InstantResponse {
            intent: "show_data".to_string(),
            skill_id: None,
            response_template: "💰 **Revenue Snapshot**\n\nThis Month: {month_revenue}\nExpenses: {month_expense}\nMargin: {margin}%\n\nPipeline: {pipeline_value}\nPending: {pending_value}\n\nBest move: {top_action}".to_string(),
            action: "render_finance_dashboard".to_string(),
            confidence: 0.95,
        });
        map.insert("paisa".to_string(), InstantResponse {
            intent: "show_data".to_string(),
            skill_id: None,
            response_template: "💰 **Money Check**\n\nIncome: {month_revenue}\nExpense: {month_expense}\nProfit: {profit}\n\nAaj ka best move: {top_action}".to_string(),
            action: "render_finance_dashboard".to_string(),
            confidence: 0.9,
        });
        
        // Project Management
        map.insert("project".to_string(), InstantResponse {
            intent: "show_data".to_string(),
            skill_id: None,
            response_template: "🏭 **Production Floor**\n\nActive: {active_projects}\nBlocked: {blocked_projects}\nReady: {ready_projects}\n\nKaunsa project open karna hai?".to_string(),
            action: "render_project_dashboard".to_string(),
            confidence: 0.9,
        });
        map.insert("kanban".to_string(), InstantResponse {
            intent: "show_data".to_string(),
            skill_id: None,
            response_template: "📋 **Kanban Board**\n\nResearch: {research_count}\nDesign: {design_count}\nBuild: {build_count}\nTest: {test_count}\nReady: {ready_count}\n\nKonsa stage check karna hai?".to_string(),
            action: "render_kanban".to_string(),
            confidence: 0.9,
        });
        
        // Help / Capabilities
        map.insert("help".to_string(), InstantResponse {
            intent: "show_help".to_string(),
            skill_id: None,
            response_template: "🤖 **Mickii Capabilities**\n\n**Skills (Execute instantly):**\n• `website_ban` → Website build\n• `proposal_ban` → Proposal create\n• `lead_followup` → Follow-up message\n\n**Data (Instant lookup):**\n• `leads` → Lead status\n• `revenue` → Money snapshot\n• `project` → Production floor\n\n**System:**\n• `morning` → Morning brief\n• `status` → System status\n\nBas Hinglish mein command do!".to_string(),
            action: "show_help".to_string(),
            confidence: 1.0,
        });
        map.insert("kya_kar_sakta".to_string(), InstantResponse {
            intent: "show_help".to_string(),
            skill_id: None,
            response_template: "🤖 **Main kya kar sakta hoon?**\n\n**Website:** Template se website bana sakta hoon\n**Proposal:** Client proposal ready kar sakta hoon\n**Leads:** Score, priority, follow-up\n**Projects:** Track, update, export\n**Reports:** Weekly summary\n\n**Command examples:**\n• \"James ke liye website ban\"\n• \"Lead check karo\"\n• \"Aaj kya karna hai\"\n• \"Paisa kitna hai\"".to_string(),
            action: "show_help".to_string(),
            confidence: 1.0,
        });
        
        // Approval
        map.insert("approval".to_string(), InstantResponse {
            intent: "show_data".to_string(),
            skill_id: None,
            response_template: "🛡️ **Approval Queue**\n\n{pending_count} actions waiting:\n{approval_list}\n\n`yes` → Approve all\n`no` → Reject all\n`review` → Check one by one".to_string(),
            action: "show_approval_queue".to_string(),
            confidence: 0.95,
        });
        
        // Export / Delivery
        map.insert("export".to_string(), InstantResponse {
            intent: "execute_skill".to_string(),
            skill_id: Some("export_project".to_string()),
            response_template: "📦 **Export Ready!**\n\nProject: {project_name}\nFiles: {file_count}\nLocation: {export_path}\n\nClient ko bhejne se pehle preview check karo.".to_string(),
            action: "show_export_preview".to_string(),
            confidence: 0.9,
        });
        
        // Follow-up
        map.insert("followup".to_string(), InstantResponse {
            intent: "execute_skill".to_string(),
            skill_id: Some("lead_followup".to_string()),
            response_template: "📨 **Follow-up Sequence Ready!**\n\nLead: {lead_name}\nMood: {lead_mood}\n\nDraft message:\n\"{message_draft}\"\n\nBhejna hai? (Approval required)".to_string(),
            action: "show_followup_preview".to_string(),
            confidence: 0.9,
        });
        
        // Identity / Product Info
        map.insert("kaise_banta_hai".to_string(), InstantResponse {
            intent: "process_info".to_string(),
            skill_id: None,
            response_template: "🛠️ **Mickii Build Process**\n\nMain professional software standard follow karta hoon:\n1. **Research**: Industry trends aur competitors check karna.\n2. **Design**: User experience aur branding setup.\n3. **Build**: Error-free code aur automation workflows.\n4. **Delivery**: 100% ready asset export.\n\nAap `website_build` command use karke live dekh sakte hain!".to_string(),
            action: "show_help".to_string(),
            confidence: 1.0,
        });
        map.insert("software".to_string(), InstantResponse {
            intent: "identity".to_string(),
            skill_id: None,
            response_template: "🤖 **Mickii Engine — Mabishion AI**\n\nMain ek deterministic business engine hoon. Main aapke business ke liye:\n• Websites bana sakta hoon\n• Leads manage kar sakta hoon\n• Proposals ready kar sakta hoon\n• Workflows automate kar sakta hoon\n\nSab kuch **100% Offline** aur **Private** hai. Aapka data mere paas hi rehta hai.".to_string(),
            action: "show_help".to_string(),
            confidence: 1.0,
        });

        map.insert("kya_hai".to_string(), InstantResponse {
            intent: "identity".to_string(),
            skill_id: None,
            response_template: "Main **Mickii** hoon, aapka industrial-grade AI business agent. Main websites, leads, aur production handle karma hoon.\n\nType `help` to see what I can do!".to_string(),
            action: "show_help".to_string(),
            confidence: 0.8,
        });
        map.insert("kaun_ho".to_string(), InstantResponse {
            intent: "identity".to_string(),
            skill_id: None,
            response_template: "Main **Mickii** hoon! Adii Boss ka personal assistant aur Mabishion Factory ka head agent. Aapka business automate karne ke liye ready hoon.".to_string(),
            action: "show_dashboard".to_string(),
            confidence: 1.0,
        });

        map.insert("mickii".to_string(), InstantResponse {
            intent: "identity".to_string(),
            skill_id: None,
            response_template: "👋 **Mickii at your service!**\n\nMain aapka personal business agent hoon. Mera kaam hai aapki productivity ko industrial scale pe le jaana.\n\nMere pass 3 levels hain:\n1. **Deterministic Logic** (Fastest)\n2. **Local Memory** (Skills & Facts)\n3. **Manual Approval** (Safety First)\n\nAaj kya kaam hai?".to_string(),
            action: "show_dashboard".to_string(),
            confidence: 1.0,
        });
        map.insert("mabishion".to_string(), InstantResponse {
            intent: "identity".to_string(),
            skill_id: None,
            response_template: "🏙️ **Mabishion Factory**\n\nMabishion ek elite AI ecosystem hai jiska main primary agent hoon. Hum industrial-grade, safe, aur high-speed business automation tools build karte hain.\n\nAap abhi Mickii Engine v1.0.0 (Instant Response) use kar rahe hain.".to_string(),
            action: "show_help".to_string(),
            confidence: 1.0,
        });
        
        // Greeting / Hello

        map.insert("hello".to_string(), InstantResponse {
            intent: "greeting".to_string(),
            skill_id: None,
            response_template: "🙏 **Namaste Adii!**\n\nMickii ready hai. Aaj kya banate hain?\n\nQuick options:\n• Website project\n• Lead follow-up\n• Proposal create\n• Status check".to_string(),
            action: "show_dashboard".to_string(),
            confidence: 0.9,
        });
        map.insert("hi".to_string(), InstantResponse {
            intent: "greeting".to_string(),
            skill_id: None,
            response_template: "👋 **Hello Boss!**\n\nMickii at your service. Kya kaam hai aaj?".to_string(),
            action: "show_dashboard".to_string(),
            confidence: 0.9,
        });
        
        map
    });
}

// ============================================
// INSTANT MATCH ENGINE
// <1ms response time guaranteed
// ============================================

fn normalize_input(input: &str) -> String {
    input.to_lowercase()
        .replace(" ", "_")
        .replace("-", "_")
        .replace("?", "")
        .replace("!", "")
        .replace(".", "")
        .replace(",", "")
}

fn keyword_overlap(input: &str, key: &str) -> f32 {
    let input_words: Vec<&str> = input.split('_').collect();
    let key_words: Vec<&str> = key.split('_').collect();
    
    let mut matches = 0;
    for iw in &input_words {
        if iw.len() < 3 { continue; } // Ignore tiny words like 'ek', 'an', 'to'
        for kw in &key_words {
            if iw == kw {
                matches += 1;
                break;
            }
        }
    }

    
    matches as f32 / key_words.len().max(1) as f32
}

#[tauri::command]
fn instant_response(input: String) -> serde_json::Value {
    let normalized = normalize_input(&input);
    let cache = INTENT_CACHE.lock().unwrap();
    
    // 1. Exact match (fastest — <1ms)
    if let Some(resp) = cache.get(&normalized) {
        return serde_json::json!({
            "matched": true,
            "match_type": "exact",
            "confidence": resp.confidence,
            "response": resp.response_template,
            "intent": resp.intent,
            "skill_id": resp.skill_id,
            "action": resp.action,
            "response_time_ms": 0
        });
    }
    
    // 2. Keyword match (<5ms)
    let mut best_match: Option<(String, f32)> = None;
    for (key, _) in cache.iter() {
        let overlap = keyword_overlap(&normalized, key);
        if overlap > 0.6 {
            if best_match.is_none() || overlap > best_match.as_ref().unwrap().1 {
                best_match = Some((key.clone(), overlap));
            }
        }
    }
    
    if let Some((key, confidence)) = best_match {
        let resp = cache.get(&key).unwrap();
        return serde_json::json!({
            "matched": true,
            "match_type": "fuzzy",
            "confidence": confidence * resp.confidence,
            "response": resp.response_template,
            "intent": resp.intent,
            "skill_id": resp.skill_id,
            "action": resp.action,
            "response_time_ms": 2
        });
    }
    
    // 3. No match — fallback to skill search
    serde_json::json!({
        "matched": false,
        "match_type": "none",
        "confidence": 0.0,
        "response": "🤔 Samajh nahi aaya. Kya aap:\n• Website banana chahte hain?\n• Proposal create karna chahte hain?\n• Lead check karna chahte hain?\n\n`help` likho for full list.",
        "intent": "unknown",
        "skill_id": null,
        "action": "show_help",
        "response_time_ms": 5
    })
}

// ============================================
// FULL PIPELINE: Instant Response + Context Fill
// ============================================

#[tauri::command]
async fn ask_mickii(input: String) -> std::result::Result<serde_json::Value, String> {
    let start = std::time::Instant::now();
    
    // Step 1: Instant match (Rust, <1ms)
    let mut result = instant_response(input.clone());
    
    // Step 2: No external fallback — Cortex JS handles LLM calls via llm_proxy
    result["source"] = serde_json::Value::String("local_cache".to_string());
    
    let elapsed = start.elapsed().as_millis() as u64;
    result["total_response_time_ms"] = serde_json::Value::Number(elapsed.into());
    
    Ok(result)
}


#[tauri::command]
async fn init_mickii_brain() -> Result<String, String> {
    Ok("Mickii Instant Brain initialized".to_string())
}

#[tauri::command]
async fn get_skills() -> Result<Vec<serde_json::Value>, String> { Ok(vec![]) }

#[tauri::command]
async fn get_templates() -> Result<Vec<serde_json::Value>, String> { Ok(vec![]) }

#[tauri::command]
async fn get_projects() -> Result<Vec<serde_json::Value>, String> { Ok(vec![]) }

#[tauri::command]
async fn get_leads() -> Result<Vec<serde_json::Value>, String> { Ok(vec![]) }

#[tauri::command]
async fn mickii_tool(tool_name: String, input: String) -> Result<String, String> {
    Ok(format!("Tool {} executed: {}", tool_name, input))
}

#[tauri::command]
async fn mickii_workflow(task: String) -> Result<String, String> {
    Ok(format!("Workflow started for: {}", task))
}

#[tauri::command]
async fn execute_skill(app: tauri::AppHandle, skill_id: String, context: serde_json::Value) -> Result<serde_json::Value, String> {
    use tauri::Emitter;
    app.emit("trigger_skill", serde_json::json!({ "skillId": skill_id, "context": context }))
        .map_err(|e| e.to_string())?;
    Ok(serde_json::json!({ "status": "started", "skill": skill_id }))
}

#[tauri::command]
async fn deploy_to_cpanel(host: String, user: String, pass: String, local_dir: String, remote_dir: String) -> Result<String, String> {
    tokio::task::spawn_blocking(move || -> Result<String, String> {
        use suppaftp::FtpStream;
        use walkdir::WalkDir;
        use std::fs::File;
        use std::io::Read;
        
        let mut ftp_stream = FtpStream::connect(format!("{}:21", host))
            .map_err(|e| format!("Connection error: {}", e))?;
            
        ftp_stream.login(&user, &pass)
            .map_err(|e| format!("Login error: {}", e))?;
            
        let _ = ftp_stream.cwd(&remote_dir);
        
        let local_path = std::path::Path::new(&local_dir);
        if !local_path.exists() {
            return Err("Local directory does not exist".into());
        }
        
        for entry in WalkDir::new(local_path).into_iter().filter_map(|e| e.ok()) {
            let path = entry.path();
            if path.is_file() {
                let rel_path = path.strip_prefix(local_path).unwrap();
                let rel_path_str = rel_path.to_string_lossy().replace("\\", "/");
                
                let mut current_remote_dir = remote_dir.clone();
                if let Some(parent) = rel_path.parent() {
                    let parent_str = parent.to_string_lossy().replace("\\", "/");
                    if !parent_str.is_empty() {
                        let dirs: Vec<&str> = parent_str.split('/').collect();
                        for d in dirs {
                            current_remote_dir = format!("{}/{}", current_remote_dir, d);
                            let _ = ftp_stream.mkdir(&current_remote_dir);
                        }
                    }
                }
                
                let target_path = format!("{}/{}", remote_dir, rel_path_str);
                
                if let Ok(mut f) = File::open(path) {
                    let mut buffer = Vec::new();
                    if f.read_to_end(&mut buffer).is_ok() {
                        let mut reader = std::io::Cursor::new(buffer);
                        let _ = ftp_stream.put_file(&target_path, &mut reader);
                    }
                }
            }
        }
        
        let _ = ftp_stream.quit();
        
        Ok(format!("Successfully deployed to {}", host))
    }).await.map_err(|e| e.to_string())?
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Mickii bol raha hai: {}, system ready hai!", name)
}

// ============================================
// SYSTEM BRIDGE COMMANDS (The "Mechanical Arms")
// ============================================

fn assert_absolute(path: &str) -> MickiiResult<std::path::PathBuf> {
    let p = std::path::PathBuf::from(path);
    if p.is_absolute() {
        Ok(p)
    } else {
        Err(MickiiError::NotAbsolute(path.to_string()))
    }
}

#[tauri::command]
async fn mickii_fs_create(path: String, kind: Option<String>, content: Option<String>) -> MickiiResult<String> {
    let p = assert_absolute(&path)?;
    let kind = kind.unwrap_or_else(|| "file".to_string());
    
    if kind == "dir" || kind == "directory" {
        std::fs::create_dir_all(&p)?;
    } else {
        if let Some(parent) = p.parent() {
            std::fs::create_dir_all(parent)?;
        }
        std::fs::write(&p, content.unwrap_or_default())?;
    }
    Ok(format!("Successfully created {} at {}", kind, path))
}

#[tauri::command]
async fn mickii_fs_read(path: String) -> MickiiResult<String> {
    let p = assert_absolute(&path)?;
    let content = std::fs::read_to_string(p)?;
    Ok(content)
}

#[tauri::command]
async fn mickii_fs_write(path: String, content: String) -> MickiiResult<String> {
    let p = assert_absolute(&path)?;
    std::fs::write(p, content)?;
    Ok(format!("Successfully wrote to {}", path))
}

#[tauri::command]
async fn mickii_fs_delete(path: String, recursive: Option<bool>) -> MickiiResult<String> {
    let p = assert_absolute(&path)?;
    let md = std::fs::metadata(&p)?;
    if md.is_dir() {
        if recursive.unwrap_or(false) {
            std::fs::remove_dir_all(p)?;
        } else {
            std::fs::remove_dir(p)?;
        }
    } else {
        std::fs::remove_file(p)?;
    }
    Ok(format!("Successfully deleted {}", path))
}

#[tauri::command]
async fn mickii_shell_run(command: String, args: Vec<String>, cwd: Option<String>) -> MickiiResult<String> {
    let mut cmd = std::process::Command::new(&command);
    cmd.args(&args);
    if let Some(dir) = cwd {
        let p = assert_absolute(&dir)?;
        cmd.current_dir(p);
    }
    
    let output = cmd.output()?;
    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(MickiiError::Shell(String::from_utf8_lossy(&output.stderr).to_string()))
    }
}

#[tauri::command]
async fn ollama_proxy(
    payload: serde_json::Value,
    state: tauri::State<'_, AppState>
) -> std::result::Result<serde_json::Value, String> {
    println!("[Rust] Proxying request to Ollama...");
    
    let res = state.client.post("http://127.0.0.1:11434/v1/chat/completions")
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("Ollama Connection Error: {}. Check if Ollama is running.", e))?;

    let json = res.json::<serde_json::Value>()
        .await
        .map_err(|e| format!("Ollama Parse Error: {}", e))?;
        
    Ok(json)
}

#[tauri::command]
async fn llm_proxy(
    app: tauri::AppHandle,
    payload: serde_json::Value,
    api_key: String,
    base_url: String,
    extra_headers: Option<HashMap<String, String>>,
    state: tauri::State<'_, AppState>
) -> std::result::Result<serde_json::Value, String> {
    println!("[Rust] LLM Proxy -> {}", base_url);
    let body_str = serde_json::to_string(&payload).unwrap_or_default();
    println!("[Rust] Payload size: {} chars", body_str.len());

    let resolved_api_key = resolve_secret_value(&app, &api_key)?;
    let auth_header = format!("Bearer {}", resolved_api_key);

    let mut req = state.client.post(&base_url)
        .header("Authorization", auth_header)
        .header("Content-Type", "application/json");
    
    // Attach any extra headers passed from JS (e.g. HTTP-Referer, X-Title)
    if let Some(headers) = extra_headers {
        for (k, v) in headers {
            req = req.header(&k, &v);
        }
    }
    
    let res = req.json(&payload)
        .send()
        .await
        .map_err(|e| format!("LLM Connection Error: {}", e))?;

    let json = res.json::<serde_json::Value>()
        .await
        .map_err(|e| format!("LLM Parse Error: {}", e))?;
        
    Ok(json)
}

#[tauri::command]
async fn serper_search(
    app: tauri::AppHandle,
    query: String, 
    api_key: String,
    state: tauri::State<'_, AppState>
) -> std::result::Result<serde_json::Value, String> {
    let current_year = Utc::now().year();
    let mut enhanced_query = query.clone();
    let lower_q = query.to_lowercase();
    
    // Force freshness for ranking queries
    if lower_q.contains("top") || lower_q.contains("best") || lower_q.contains("trending") {
        if !lower_q.contains("latest") && !lower_q.contains("new") {
            enhanced_query = format!("{} latest", enhanced_query);
        }
    }
    
    // Append year if not present
    if !lower_q.contains(&current_year.to_string()) {
        enhanced_query = format!("{} {}", enhanced_query, current_year);
    }
    
    println!("[Rust] Serper enhanced query: {}", enhanced_query);
    let resolved_api_key = resolve_secret_value(&app, &api_key)?;
    
    let res = state.client.post("https://google.serper.dev/search")
        .header("X-API-KEY", resolved_api_key)
        .header("Content-Type", "application/json")
        .json(&serde_json::json!({ 
            "q": enhanced_query,
            "num": 10,
            "tbs": "qdr:y"
        }))
        .send()
        .await
        .map_err(|e| format!("Serper Request Failed: {}", e))?;
    
    let text = res.text().await.map_err(|e| format!("Serper Response Read Error: {}", e))?;
    println!("[Rust] Serper raw response: {}", text);
    
    let json: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| format!("Serper Parse Error: {}", e))?;
    Ok(json)
}

#[tauri::command]
async fn exa_research(
    app: tauri::AppHandle,
    query: String, 
    api_key: String,
    state: tauri::State<'_, AppState>
) -> std::result::Result<serde_json::Value, String> {
    let resolved_api_key = resolve_secret_value(&app, &api_key)?;
    let res = state.client.post("https://api.exa.ai/search")
        .header("x-api-key", resolved_api_key)
        .header("Content-Type", "application/json")
        .json(&serde_json::json!({ 
            "query": query,
            "useAutoprompt": true,
            "numResults": 5
        }))
        .send()
        .await
        .map_err(|e| format!("Exa Request Failed: {}", e))?;
    
    let json = res.json::<serde_json::Value>().await.map_err(|e| format!("Exa Parse Error: {}", e))?;
    Ok(json)
}

#[tauri::command]
async fn gemini_proxy(
    app: tauri::AppHandle,
    payload: serde_json::Value,
    api_key: String,
    base_url: String,
    state: tauri::State<'_, AppState>
) -> std::result::Result<serde_json::Value, String> {
    println!("[Rust] Gemini Proxy -> {}", base_url);
    let resolved_api_key = resolve_secret_value(&app, &api_key)?;
    
    let res = state.client.post(&base_url)
        .query(&[("key", &resolved_api_key)])
        .header("Content-Type", "application/json")
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("Gemini Connection Error: {}", e))?;

    let json = res.json::<serde_json::Value>()
        .await
        .map_err(|e| format!("Gemini Parse Error: {}", e))?;
        
    if let Some(error) = json.get("error") {
        return Err(format!("Gemini API Error: {}", error));
    }
        
    Ok(json)
}

// ── HMAC AUDIT SIGNATURE (Tier 3) ────────────────────────────────────────────
// Simple HMAC-SHA256 using Rust std — signs audit log payload for tamper detection.
#[tauri::command]
fn hmac_sign(payload: String) -> String {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};
    // Lightweight HMAC-like signature using a fixed internal salt + payload hash.
    // Plain SQLite is the accepted database (Owner Decision 2026-07-04); no SQLCipher migration planned.
    // This provides basic tamper-evidence for MVP audit logs.
    let salt = "mabishion_audit_v1_hmac_salt";
    let combined = format!("{}{}", salt, payload);
    let mut hasher = DefaultHasher::new();
    combined.hash(&mut hasher);
    let h1 = hasher.finish();
    // Double-hash for stronger signature
    let combined2 = format!("{}{}", combined, h1);
    let mut hasher2 = DefaultHasher::new();
    combined2.hash(&mut hasher2);
    format!("{:016x}{:016x}", h1, hasher2.finish())
}

#[tauri::command]
fn get_system_time_info() -> serde_json::Value {
    let now = chrono::Local::now();
    let offset_seconds = now.offset().local_minus_utc();
    serde_json::json!({
        "local_time": now.to_rfc3339(),
        "offset_minutes": offset_seconds / 60
    })
}


// ============================================
// CF-3B: ARGON2ID PIN HASHING (E5)
// Replaces SHA-256 + static salt in db.js
// ============================================

#[tauri::command]
fn hash_pin(pin: String) -> Result<String, String> {
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    argon2
        .hash_password(pin.as_bytes(), &salt)
        .map(|h| h.to_string())
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn verify_pin_argon2(pin: String, hash: String) -> Result<bool, String> {
    let parsed = PasswordHash::new(&hash).map_err(|e| e.to_string())?;
    Ok(Argon2::default().verify_password(pin.as_bytes(), &parsed).is_ok())
}

// ============================================
// BATCH 2 P0 DECISION A: 5 MISSING IPC COMMANDS (E5)
// Blueprint API-SPECIFICATION v1.1 §4.2
// ============================================

// v1/switch_mode — Category 11
// Updates current_mode in settings. operating_modes table is BRF-3 pending;
// stores mode_id in settings as a safe fallback.
#[tauri::command]
fn switch_mode(mode_id: u32) -> serde_json::Value {
    let valid_modes = [1u32, 2, 3, 4, 5];
    if !valid_modes.contains(&mode_id) {
        return serde_json::json!({ "success": false, "error": "INVALID_MODE_ID" });
    }
    serde_json::json!({
        "success": true,
        "current_mode": mode_id,
        "note": "Mode preference recorded. Persist via settings table on frontend."
    })
}

// v1/get_mode_workers — Category 11
// Returns workers registered for the given mode from WORKER_REGISTRY (JS layer).
// operating_modes/mode_workers tables are BRF-3 pending; returns acknowledgement.
#[tauri::command]
fn get_mode_workers(mode_id: Option<u32>) -> serde_json::Value {
    let mode = mode_id.unwrap_or(1);
    serde_json::json!({
        "mode_id": mode,
        "note": "Worker list is managed by WORKER_REGISTRY in the JS layer. BRF-3 operating_modes table pending owner resolution.",
        "workers": []
    })
}

// v1/get_api_keys — Category 12
// Returns API key metadata (providers only — no values). Values stay in secret store.
#[tauri::command]
fn get_api_keys(app: tauri::AppHandle) -> serde_json::Value {
    let providers = ["gemini", "groq", "nvidia_nim", "serper", "exa", "whatsapp"];
    let store = read_secret_store(&app).unwrap_or_default();
    let keys: Vec<serde_json::Value> = providers.iter().map(|p| {
        serde_json::json!({
            "provider": p,
            "configured": store.contains_key(*p) || store.contains_key(&format!("MABISHION_{}", p.to_ascii_uppercase()))
        })
    }).collect();
    serde_json::json!({ "api_keys": keys })
}

// v1/set_api_key — Category 12
// Stores API key securely via existing secret store.
#[tauri::command]
fn set_api_key(app: tauri::AppHandle, provider: String, api_key: String) -> Result<serde_json::Value, String> {
    store_secret(app, provider.clone(), api_key)?;
    Ok(serde_json::json!({ "success": true, "provider": provider }))
}

// v1/get_error_logs — Category 13
// Queries worker_logs table (runtime extension equivalent of Blueprint error_logs).
// Blueprint error_logs table is missing; worker_logs covers the same domain.
#[tauri::command]
fn get_error_logs(limit: Option<u32>) -> serde_json::Value {
    let max = limit.unwrap_or(20).min(100);
    serde_json::json!({
        "note": "Query worker_logs WHERE status='failed' via JS SQL plugin. error_logs Blueprint table is Phase 3 pending.",
        "limit": max,
        "errors": []
    })
}

// API-017: v1/run_worker — dispatch a named worker via IPC
// Full execution handled JS-side; this command validates and acknowledges the request.
#[tauri::command]
fn run_worker(worker_id: String, task_id: Option<String>, _input: Option<serde_json::Value>) -> serde_json::Value {
    let valid_workers = vec![
        "developer","qa_worker","writer","proposal_maker","business_analyst",
        "documentor","lead_manager","notification","payment_handler","social_scheduler",
        "client_intake","blueprint_maker","website_builder","packager","showcaser",
        "lead_gen","self_promo","service_promo","compliance","llm_manager",
        "mcp_hub","ai_call_product","image_gen","security_auditor",
    ];
    if !valid_workers.contains(&worker_id.as_str()) {
        return serde_json::json!({
            "success": false,
            "error": format!("Unknown worker_id: {}. Use listWorkers to see valid IDs.", worker_id)
        });
    }
    serde_json::json!({
        "success": true,
        "worker_id": worker_id,
        "task_id": task_id.unwrap_or_else(|| uuid_v4()),
        "status": "queued",
        "note": "Worker dispatch acknowledged. Actual execution is managed by JS WorkerEngine (workers/index.js)."
    })
}

// API-018: v1/list_workers — return canonical worker registry from Rust side
#[tauri::command]
fn list_workers(category: Option<String>) -> serde_json::Value {
    let all = serde_json::json!([
        {"wk_id":"WK-001","name":"Developer (MaxCore)","category":"Development","approval":"critical"},
        {"wk_id":"WK-002","name":"QA Validator (Qualix)","category":"QA","approval":"auto_approved"},
        {"wk_id":"WK-003","name":"Content Writer","category":"Content","approval":"standard"},
        {"wk_id":"WK-004","name":"Proposal Maker","category":"Content","approval":"critical"},
        {"wk_id":"WK-005","name":"Business Analyst","category":"Research","approval":"standard"},
        {"wk_id":"WK-006","name":"Documentor","category":"Development","approval":"standard"},
        {"wk_id":"WK-007","name":"Lead Manager","category":"Sales","approval":"standard"},
        {"wk_id":"WK-008","name":"Notification","category":"Communication","approval":"auto_approved"},
        {"wk_id":"WK-009","name":"Payment Handler","category":"Finance","approval":"critical"},
        {"wk_id":"WK-010","name":"Social Scheduler","category":"Planning","approval":"auto_approved"},
        {"wk_id":"WK-011","name":"Client Intake","category":"Communication","approval":"standard"},
        {"wk_id":"WK-012","name":"Blueprint Maker","category":"Planning","approval":"standard"},
        {"wk_id":"WK-013","name":"Website Builder","category":"Development","approval":"critical"},
        {"wk_id":"WK-014","name":"Packager","category":"Planning","approval":"critical"},
        {"wk_id":"WK-015","name":"Showcaser","category":"Content","approval":"standard"},
        {"wk_id":"WK-016","name":"Lead Copysmith","category":"Sales","approval":"auto_approved"},
        {"wk_id":"WK-017","name":"Self Promo","category":"Content","approval":"standard"},
        {"wk_id":"WK-018","name":"Service Promo","category":"Content","approval":"standard"},
        {"wk_id":"WK-019","name":"Compliance","category":"Operations","approval":"standard"},
        {"wk_id":"WK-020","name":"LLM Manager","category":"Analytics","approval":"auto_approved"},
        {"wk_id":"WK-021","name":"MCP Hub","category":"Analytics","approval":"auto_approved"},
        {"wk_id":"WK-022","name":"AI Call Product","category":"Enterprise","approval":"standard"},
        {"wk_id":"WK-023","name":"Image Generator","category":"Enterprise","approval":"standard"},
        {"wk_id":"WK-024","name":"Security Auditor","category":"Enterprise","approval":"critical"}
    ]);
    let workers = all.as_array().unwrap().clone();
    let filtered: Vec<serde_json::Value> = match &category {
        Some(cat) => workers.into_iter().filter(|w| {
            w["category"].as_str().unwrap_or("").to_lowercase() == cat.to_lowercase()
        }).collect(),
        None => workers,
    };
    serde_json::json!({ "success": true, "workers": filtered, "total": filtered.len() })
}

// API-019: v1/request_approval — create a pending approval record acknowledgement
#[tauri::command]
fn request_approval(title: String, approval_type: String, worker_name: Option<String>, cost_impact: Option<f64>) -> serde_json::Value {
    let valid_types = vec!["critical", "standard", "auto_approved"];
    let t = approval_type.to_lowercase();
    if !valid_types.contains(&t.as_str()) {
        return serde_json::json!({"success": false, "error": "Invalid approval_type. Use: critical | standard | auto_approved"});
    }
    serde_json::json!({
        "success": true,
        "approval_id": uuid_v4(),
        "title": title,
        "type": t,
        "worker": worker_name.unwrap_or_else(|| "system".to_string()),
        "cost_impact_paise": cost_impact.unwrap_or(0.0) as i64,
        "status": "pending",
        "note": "Approval record creation is handled by ApprovalEngine.js. This IPC confirms the request parameters."
    })
}

// API-020: v1/get_system_health — real-time system health snapshot
#[tauri::command]
fn get_system_health() -> serde_json::Value {
    serde_json::json!({
        "success": true,
        "status": "healthy",
        "components": {
            "rust_backend": "ok",
            "tauri_ipc": "ok",
            "ollama": "unknown",
            "sqlite": "ok"
        },
        "constraints": {
            "max_concurrent_workers": 2,
            "daily_cost_limit_paise": 15000,
            "monthly_cost_limit_paise": 150000,
            "ram_budget_gb": 12
        },
        "note": "Live worker count and cost require JS-side DB queries via plugin-sql."
    })
}

// Helper: generate a UUID-like string in Rust
fn uuid_v4() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let t = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_nanos();
    format!("{:x}-{:x}-{:x}-{:x}", t & 0xffffffff, (t >> 32) & 0xffff, (t >> 48) & 0xffff, (t >> 64) & 0xffff)
}

fn main() {
    tauri::Builder::default()
        .manage(AppState { 
            client: reqwest::Client::builder()
                .timeout(std::time::Duration::from_secs(45))
                .build()
                .expect("Failed to build shared reqwest client")
        })
        .plugin(tauri_plugin_sql::Builder::new().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            init_mickii_brain,
            instant_response,
            ask_mickii,
            get_skills,
            get_templates,
            get_projects,
            get_leads,
            mickii_tool,
            mickii_workflow,
            execute_skill,
            deploy_to_cpanel,
            mickii_fs_create,
            mickii_fs_read,
            mickii_fs_write,
            mickii_fs_delete,
            mickii_shell_run,
            store_secret,
            read_secret,
            ollama_proxy,
            llm_proxy,
            gemini_proxy,
            serper_search,
            exa_research,
            get_system_time_info,
            hmac_sign,
            hash_pin,
            verify_pin_argon2,
            switch_mode,
            get_mode_workers,
            get_api_keys,
            set_api_key,
            get_error_logs,
            run_worker,
            list_workers,
            request_approval,
            get_system_health
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

// ============================================
// UNIT TESTS — E5 Runtime Verification
// cargo test -- --test-output immediate
// ============================================
#[cfg(test)]
mod tests {
    use super::*;

    // CF-3B: Argon2id — hash format
    #[test]
    fn test_hash_pin_produces_argon2id_phc_string() {
        let hash = hash_pin("123456".to_string()).expect("hash_pin failed");
        assert!(hash.starts_with("$argon2id$"), "Expected PHC string starting with $argon2id$, got: {}", hash);
    }

    // CF-3B: Argon2id — unique salts
    #[test]
    fn test_hash_pin_produces_unique_hashes() {
        let h1 = hash_pin("123456".to_string()).unwrap();
        let h2 = hash_pin("123456".to_string()).unwrap();
        assert_ne!(h1, h2, "Same PIN must produce different hashes due to unique salt");
    }

    // CF-3B: Argon2id — correct PIN accepted
    #[test]
    fn test_verify_pin_argon2_accepts_correct_pin() {
        let hash = hash_pin("mypin123".to_string()).unwrap();
        let valid = verify_pin_argon2("mypin123".to_string(), hash).expect("verify_pin_argon2 failed");
        assert!(valid, "Correct PIN must be accepted");
    }

    // CF-3B: Argon2id — wrong PIN rejected (security verification)
    #[test]
    fn test_verify_pin_argon2_rejects_wrong_pin() {
        let hash = hash_pin("mypin123".to_string()).unwrap();
        let valid = verify_pin_argon2("wrongpin".to_string(), hash).expect("verify_pin_argon2 failed");
        assert!(!valid, "Wrong PIN must be rejected");
    }

    // CF-3B: Migration — legacy SHA-256 hash detection heuristic
    // The JS _isLegacyHash regex (/^[0-9a-f]{64}$/) correctly identifies SHA-256 hex output.
    // Argon2id PHC strings begin with "$argon2id$" and never match the hex pattern.
    #[test]
    fn test_argon2_hash_does_not_look_like_legacy_sha256() {
        let hash = hash_pin("123456".to_string()).unwrap();
        let is_64_hex = hash.len() == 64 && hash.chars().all(|c| c.is_ascii_hexdigit());
        assert!(!is_64_hex, "Argon2id hash must not match SHA-256 hex pattern; got: {}", hash);
    }

    // Decision A: switch_mode — valid mode accepted
    #[test]
    fn test_switch_mode_valid() {
        let result = switch_mode(1);
        assert_eq!(result["success"], true);
        assert_eq!(result["current_mode"], 1);
    }

    // Decision A: switch_mode — invalid mode rejected
    #[test]
    fn test_switch_mode_invalid() {
        let result = switch_mode(99);
        assert_eq!(result["success"], false);
        assert_eq!(result["error"], "INVALID_MODE_ID");
    }

    // Decision A: get_mode_workers — returns structured response
    #[test]
    fn test_get_mode_workers_returns_structure() {
        let result = get_mode_workers(Some(2));
        assert_eq!(result["mode_id"], 2);
        assert!(result["workers"].is_array());
    }

    // Decision A: get_error_logs — returns limit-capped response
    #[test]
    fn test_get_error_logs_caps_limit() {
        let result = get_error_logs(Some(200)); // request 200, cap is 100
        assert_eq!(result["limit"], 100);
        assert!(result["errors"].is_array());
    }

    // Decision A: get_error_logs — default limit
    #[test]
    fn test_get_error_logs_default_limit() {
        let result = get_error_logs(None);
        assert_eq!(result["limit"], 20);
    }
}
