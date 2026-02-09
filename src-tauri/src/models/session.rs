use std::collections::HashMap;
use std::sync::Mutex;

pub struct OnnxState {
    pub sessions: Mutex<HashMap<String, ort::session::Session>>,
}

impl OnnxState {
    pub fn new() -> Self {
        Self {
            sessions: Mutex::new(HashMap::new()),
        }
    }
}
