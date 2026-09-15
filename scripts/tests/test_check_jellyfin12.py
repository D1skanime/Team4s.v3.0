"""Local diagnostic boundary tests; no provider or application database is used."""
import contextlib
import importlib.util
import io
import json
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('jellyfin_check', Path(__file__).resolve().parents[1] / 'check-jellyfin12.py')
check = importlib.util.module_from_spec(spec)
spec.loader.exec_module(check)


class ProbeBoundaryTests(unittest.TestCase):
    def test_header_range_redirect_and_safe_error_output(self):
        calls, foreign_calls = [], []
        key = 'fixture-secret-"quoted"'

        class Foreign(BaseHTTPRequestHandler):
            def do_GET(self):
                foreign_calls.append(self.path)
                self.send_response(200)
                self.end_headers()
            def log_message(self, *args):
                pass

        foreign = ThreadingHTTPServer(('127.0.0.1', 0), Foreign)

        class Origin(BaseHTTPRequestHandler):
            def do_GET(self):
                calls.append((self.path, self.headers.get('Authorization'), self.headers.get('Range')))
                if self.path == '/redirect':
                    self.send_response(302)
                    self.send_header('Location', 'http://127.0.0.1:' + str(foreign.server_port) + '/target')
                    self.end_headers()
                    return
                self.send_response(206 if self.path == '/range' else 200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                body = b'12345678' if self.path == '/range' else (b'x' * 32 if self.path == '/large' else b'bad-' + key.encode())
                self.wfile.write(body)
            def log_message(self, *args):
                pass

        origin = ThreadingHTTPServer(('127.0.0.1', 0), Origin)
        servers = [origin, foreign]
        threads = [threading.Thread(target=s.serve_forever, daemon=True) for s in servers]
        for thread in threads:
            thread.start()
        try:
            probe = check.Probe('http://127.0.0.1:' + str(origin.server_port), key)
            probe.get('range', '/range', binary=True, prefix=8, expected=(206,))
            probe.get('redirect', '/redirect', expected=(302,))
            probe.get('malformed', '/bad')
            with patch.object(check, 'MAX_JSON_BYTES', 16):
                probe.get('large', '/large')
            self.assertEqual([], foreign_calls)
            self.assertEqual(4, len(calls))
            self.assertEqual('bytes=0-7', calls[0][2])
            self.assertEqual('MediaBrowser Token="fixture-secret-\\"quoted\\""', calls[0][1])
            self.assertTrue(all('secret' not in path for path, _, _ in calls))
            self.assertEqual(8, probe.requests[0]['bytes_read'])
            self.assertEqual(17, probe.requests[3]['bytes_read'])
            self.assertEqual('JSONDecodeError', probe.requests[2]['error_type'])
            self.assertNotIn(key, json.dumps([probe.requests, probe.failures]))
            self.assertEqual(2, len(probe.failures))
        finally:
            for server in servers:
                server.shutdown()
                server.server_close()
            for thread in threads:
                thread.join()

    def test_request_budget_stops_before_network(self):
        probe = check.Probe('http://invalid.invalid', 'synthetic')
        probe.requests = [{}] * check.MAX_REQUESTS
        with self.assertRaises(RuntimeError), patch.object(probe.opener, 'open') as network:
            probe.get('over-budget', '/Items')
        network.assert_not_called()

    def test_secret_in_whitelisted_payload_is_rejected_before_write(self):
        key = 'private-fixture-key'
        report = {'request_count': 1, 'failures': [], 'track': {'codec': key}}
        argv = ['check', '--read-only', '--output', str(check.EVIDENCE / 'synthetic-never-written.json')]
        with patch('sys.argv', argv), patch.object(check, 'configuration', return_value=('http://localhost', key)), \
                patch.object(check, 'run', return_value=report), patch.object(Path, 'write_text') as write, \
                contextlib.redirect_stdout(io.StringIO()) as captured:
            self.assertEqual(2, check.main())
        write.assert_not_called()
        self.assertNotIn(key, captured.getvalue())

    def test_external_output_path_is_rejected_before_configuration(self):
        with patch('sys.argv', ['check', '--read-only', '--output', '/tmp/outside-evidence.json']), \
                patch.object(check, 'configuration') as configuration, contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(2, check.main())
        configuration.assert_not_called()


if __name__ == '__main__':
    unittest.main()
