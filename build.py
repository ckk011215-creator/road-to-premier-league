#!/usr/bin/env python3
"""舊入口：改為呼叫 node build.mjs"""
import subprocess, sys, pathlib
sys.exit(subprocess.call(['node', str(pathlib.Path(__file__).parent / 'build.mjs')]))
